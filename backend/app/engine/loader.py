from app.engine.constants import DATA_DIR
from llama_parse import LlamaParse
from llama_index.core.readers import SimpleDirectoryReader
from dotenv import load_dotenv

load_dotenv()

def get_documents():
    parser = LlamaParse(  
    result_type="markdown", 
        verbose=True,
    )

    file_extractor = {".pdf": parser}
    documents = SimpleDirectoryReader(
        DATA_DIR, file_extractor=file_extractor
    ).load_data()
    return documents
