import logging
import os
from app.engine.constants import DATA_DIR
from app.engine.index import get_index
from llama_index.agent.openai import OpenAIAgent
from llama_index.core.tools import QueryEngineTool, ToolMetadata, FunctionTool
from llama_index.core import SummaryIndex, SimpleDirectoryReader, VectorStoreIndex, load_index_from_storage, StorageContext
from llama_index.llms.openai import OpenAI
from llama_index.core.node_parser import SentenceSplitter
from llama_index.core.objects import ObjectIndex
from llama_parse import LlamaParse
import nest_asyncio;

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger()

node_parser = SentenceSplitter()


def get_chat_engine():
    system_prompt = os.getenv("SYSTEM_PROMPT")
    top_k = os.getenv("TOP_K", 3)

    return get_index().as_chat_engine(
        similarity_top_k=int(top_k),
        system_prompt=system_prompt,
        chat_mode="condense_plus_context",
    )
    
def get_query_engine_tools():
    agents={}
    query_engines={}
    all_nodes=[]
    documents= {}
    for doc in os.listdir(DATA_DIR):
        file = f"{DATA_DIR}/{doc}"
        if os.path.isdir(file):
            continue
        doc = doc.split(".")[0]
        nest_asyncio.apply()
        logging.info(f"Loading {doc}...")
        parser = LlamaParse(
            result_type="markdown",
            verbose=True,
        )
        file_extractor = {".pdf": parser}
        documents[doc] = SimpleDirectoryReader(input_files=[file], file_extractor=file_extractor).load_data()
        nodes = node_parser.get_nodes_from_documents(documents[doc])
        all_nodes.extend(nodes)
        if not os.path.exists(f"{DATA_DIR}/{doc}") and not os.path.isdir(f"{DATA_DIR}/{doc}"):
            vector_index = VectorStoreIndex(nodes)
            vector_index.storage_context.persist(persist_dir= f"{DATA_DIR}/{doc}")
        else:
            vector_index = load_index_from_storage(
                StorageContext.from_defaults(persist_dir=f"{DATA_DIR}/{doc}")
            )
        summary_index = SummaryIndex(nodes)
        vector_query_engine = vector_index.as_query_engine()
        summary_query_engine = summary_index.as_query_engine()
        query_engine_tools = [
            QueryEngineTool(
            query_engine=vector_query_engine,
            metadata=ToolMetadata(
                name="vector_tool",
                description=(
                    "Useful for any requests that require a specific section of the {documents}." 
                ),
            ),
        ),
        QueryEngineTool(
            query_engine=summary_query_engine,
            metadata=ToolMetadata(
                name="summary_tool",
                description=(
                    "Useful for any requests that require a summary of the {documents}. For questions about more specific sections, please use the vector_tool."
                ),
            ),
        ),
        ]
    
        function_llm = OpenAI(model="gpt-4o")
        agent = OpenAIAgent.from_tools(
            query_engine_tools,
        llm=function_llm,
        verbose=True,
        system_prompt=f"""\
You are a specialized agent designed to answer queries about the following {documents}.
You must ALWAYS use at least one of the tools provided when answering a question; do NOT rely on prior knowledge.\
""",
    )
        agents[doc] = agent
        query_engines[doc] = vector_index.as_query_engine(
            similarity_top_k=2
        )
        logging.info(f"Loaded {doc}!")
    all_tools=[]
    for doc in os.listdir(DATA_DIR):
        file = f"{DATA_DIR}/{doc}"
        if os.path.isdir(file):
            logging.info(f"Skipping {doc} as it is a directory!")
            continue
        doc = doc.split(".")[0]
        logging.info(f"Creating agent for {doc}...")
        doc_summary = (
            f"Summary of the {doc}:\n"
            f"Use this tool if you want to answer any questions about {doc}. \n"
        )
        
        doc_tool = QueryEngineTool(
            query_engine = agents[doc],
            metadata=ToolMetadata(
                name=f"{doc}_tool",
                description=doc_summary,
            ),
        )
        all_tools.append(doc_tool)
    #TODO: Agents for function tools and append to all_tools (Query Engine should be a FunctionTool.from_defaults(<FunctionName>))
    for i in all_tools:
        logging.info(i.metadata.name)
    obj_index = ObjectIndex.from_objects(
            all_tools,
            index_cls = VectorStoreIndex
        )
    return obj_index

def get_top_agent(obj_index):
    top_agent = OpenAIAgent.from_tools(
        tool_retriever=obj_index.as_retriever(similarity_top_k=3),
        system_prompt=""" \
            You are an agent designed to answer questions about the following documents. Please always use the tools provided to answer your questions. Do not rely on prior knowledge. \
        """,
        verbose= True
    )
    return top_agent