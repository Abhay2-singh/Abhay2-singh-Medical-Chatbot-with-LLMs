from flask import Flask, render_template, request
from src.helper import download_hugging_face_embeddings
from langchain_pinecone import PineconeVectorStore
from langchain_groq import ChatGroq
from langchain.chains import create_retrieval_chain
from langchain.chains.combine_documents import create_stuff_documents_chain
from langchain_core.prompts import ChatPromptTemplate
from dotenv import load_dotenv
from src.prompt import system_prompt
import os
from threading import Lock

# Load environment variables
load_dotenv()

# Get API keys
PINECONE_API_KEY = os.environ.get("PINECONE_API_KEY")
GROQ_API_KEY = os.environ.get("GROQ_API_KEY")
app = Flask(__name__)

rag_chain = None
rag_chain_lock = Lock()


def get_rag_chain():
    global rag_chain

    if rag_chain is None:
        with rag_chain_lock:
            if rag_chain is None:
                embeddings = download_hugging_face_embeddings()
                docsearch = PineconeVectorStore.from_existing_index(
                    index_name="medical-chatbot",
                    embedding=embeddings
                )
                retriever = docsearch.as_retriever(
                    search_type="similarity",
                    search_kwargs={"k": 3}
                )
                chatModel = ChatGroq(
                    groq_api_key=GROQ_API_KEY,
                    model_name="openai/gpt-oss-20b"
                )
                prompt = ChatPromptTemplate.from_messages(
                    [
                        ("system", system_prompt),
                        ("human", "{input}"),
                    ]
                )
                question_answer_chain = create_stuff_documents_chain(
                    chatModel,
                    prompt
                )
                rag_chain = create_retrieval_chain(
                    retriever,
                    question_answer_chain
                )

    return rag_chain

# Home route
@app.route("/")
def index():
    return render_template("chat.html")

# Chat route
@app.route("/get", methods=["GET", "POST"])
def chat():
    msg = request.form["msg"]

    print("User Input:", msg)

    response = get_rag_chain().invoke({
        "input": msg
    })

    answer = response["answer"]

    print("Response:", answer)

    return str(answer)

# Run app
if __name__ == "__main__":
    app.run(
        host="0.0.0.0",
        port=8080,
        debug=True
    )