import json
import os
import shutil
import time
from queue import Queue
from typing import List
from app.settings import init_settings
from llama_index.core.instrumentation.events.base import BaseEvent
from pydantic import BaseModel, Field
from fastapi.responses import StreamingResponse
from fastapi import APIRouter, Depends, File, Form, HTTPException, Request, UploadFile, status
from llama_index.core.chat_engine.types import BaseChatEngine
from llama_index.core.llms import ChatMessage, MessageRole
from llama_index.core.instrumentation import get_dispatcher
from llama_index.core.instrumentation.event_handlers import BaseEventHandler
from llama_index.core.instrumentation.events.retrieval import (
    RetrievalEndEvent,
    RetrievalStartEvent
)
from llama_index.core.instrumentation.events.embedding import (
    EmbeddingEndEvent
)
from llama_index.core.instrumentation.events.llm import (
    LLMChatEndEvent
)
from llama_index.core.instrumentation.events.chat_engine import (
    StreamChatDeltaReceivedEvent,
    StreamChatStartEvent,
    StreamChatEndEvent
)
from llama_index.core.utilities.token_counting import TokenCounter
from app.engine import get_chat_engine, get_query_engine_tools, get_top_agent
from app.engine.constants import DATA_DIR

chat_router = r = APIRouter()

dispatcher = get_dispatcher()

class EventToSend(BaseModel):
    type:str = Field(default='data', pattern="data|text")
    status:str = Field(default="loading", pattern="loading|done")
    is_last_event:bool = False
    message:str

tokens_used = {
    "in": 0,
    "out": 0,
}
event_q = Queue()
class CustomEventHandler(BaseEventHandler):
    def handle(self, event: BaseEvent) -> None:
        if isinstance(event, RetrievalStartEvent):
            event_q.put(EventToSend(
                message="Retrieving relevant nodes..."
            ))
        elif isinstance(event, EmbeddingEndEvent):
            event_q.put(EventToSend(
                status="done",
                message=f"Done embedding {len(event.chunks)} query chunks for retrieval."
            ))
        elif isinstance(event, RetrievalEndEvent):
            event_q.put(EventToSend(
                status="done",
                message=f"Retrieved {len(event.nodes)} relevant nodes for context."
            ))
        elif isinstance(event, StreamChatStartEvent):
            event_q.put(EventToSend(
                status="done",
                message="Started streaming chat response."
            ))
        elif isinstance(event, StreamChatDeltaReceivedEvent):
            event_q.put(EventToSend(
                type="text",
                message=str(event.delta)
            ))
        elif isinstance(event, LLMChatEndEvent):
            token_counter = TokenCounter()
            tokens_used['in'] += token_counter.estimate_tokens_in_messages(event.messages)
            tokens_used['out'] += token_counter.get_string_tokens(str(event.response.message))
        elif isinstance(event, StreamChatEndEvent):
            event_q.put(EventToSend(
                status="done",
                is_last_event=True,
                message=f"Finished streaming chat response. Tokens used -> Input: {tokens_used['in']} & Output: {tokens_used['out']}"
            ))
        
dispatcher.add_event_handler(CustomEventHandler())

class _Message(BaseModel):
    role: MessageRole
    content: str


class _ChatData(BaseModel):
    messages: List[_Message]

stream_part_types = {
    "text": "0",
    "function_call": "1",
    "data": "2",
    "error": "3",
    "assistant_message": "4",
    "assistant_data_stream_part": "5",
    "data_stream_part": "6",
    "message_annotations_stream_part": "7",
}

objects_store = []

@r.post("")
async def chat(
    request: Request,
    data: _ChatData,
    # chat_engine: BaseChatEngine = Depends(get_top_agent()),
):
    # check preconditions and get last message
    chat_engine : BaseChatEngine = get_top_agent(objects_store[-1])
    if len(data.messages) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No messages provided",
        )
    lastMessage = data.messages.pop()
    if lastMessage.role != MessageRole.USER:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Last message must be from user",
        )
    # convert messages coming from the request to type ChatMessage
    messages = [
        ChatMessage(
            role=m.role,
            content=m.content,
        )
        for m in data.messages
    ]

    # query chat engine
    response = await chat_engine.astream_chat(lastMessage.content, messages)

    # stream response
    async def event_generator():
        while True:
            if await request.is_disconnected():
                break
            next_event: EventToSend = event_q.get(timeout=30.0)
            if next_event.type == "text":
                yield f"{stream_part_types[next_event.type]}:{json.dumps(next_event.message)}\n"
            else:
                yield f"{stream_part_types[next_event.type]}:{json.dumps([next_event.model_dump()])}\n"
            if next_event.is_last_event:
                break
    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "X-Experimental-Stream-Data": "true"
        }
    )

@r.post("/upload")
async def upload(file: UploadFile = File(...), author: str = Form(...)):
    name = file.filename.replace(" ", "_").split(".")[0]+f"_{author}"+f".{file.filename.split('.')[-1]}"
    path = f"{DATA_DIR}/{name}"
    with open(path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    return {"filename": name}



@r.get("/generate")
async def generate():
    init_settings()
    obj = get_query_engine_tools()
    objects_store.clear()
    objects_store.append(obj)
    return {
        "message": "Success"
    }
    # return generate_datasource()

@r.get("/status")
async def status():
    return {
        "status": "running"
    }

class ChatRequest(BaseModel):
    history: List[dict] = []

class ChatResponse(BaseModel):
    response: dict
    updated_history: List[dict]

@r.post("/v2",)
async def chatv2(request: ChatRequest):
    history = request.history
    full_query = history[-1]["content"]
    agent = get_top_agent(objects_store[-1])
    response = agent.query(full_query)
    response_text = {"role":"assistant","content":str(response),"id":str(len(history)+1)}
    updated_history = history + [response_text]

    return {"response":response_text, "updated_history":updated_history}

@r.post("/bulkUpload")
async def bulkUpload(
    file: list[UploadFile] = [File(...)],
):
    if os.path.exists(DATA_DIR):
        shutil.rmtree(DATA_DIR)
    os.mkdir(DATA_DIR)
    names = []
    for f in file:
        name = f.filename.replace(" ", "_")
        path = f"{DATA_DIR}/{name}"
        with open(path, "wb") as buffer:
            shutil.copyfileobj(f.file, buffer)
        names.append(name)
    await generate()
    return {"filenames": names}