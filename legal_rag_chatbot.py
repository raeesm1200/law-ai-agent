#!/usr/bin/env python3
"""
Legal RAG Chatbot using Groq LLM, Qdrant Vector Store, and LangChain
Provides legal assistance using Italian legal documents translated to English
"""
# Use search method for older qdrant-client versions
from qdrant_client.http import models as qdrant_models
import os
import sys
import json
import time
from typing import List, Dict, Any, Optional
from pathlib import Path

import colorama
from colorama import Fore, Back, Style
from dotenv import load_dotenv

# LangChain imports
from langchain.schema import Document
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain.prompts import ChatPromptTemplate, PromptTemplate
from langchain.schema.runnable import RunnablePassthrough
from langchain.schema.output_parser import StrOutputParser
from langchain_groq import ChatGroq
from langchain_community.vectorstores import Qdrant
from langchain_community.embeddings import SentenceTransformerEmbeddings

# Qdrant imports
from qdrant_client import QdrantClient
from qdrant_client.http import models as qdrant_models

# Initialize colorama for colored terminal output
colorama.init(autoreset=True)

# Load environment variables
load_dotenv()

class LegalRAGChatbot:
    """
    A RAG-based legal chatbot that retrieves relevant legal documents from Qdrant
    and uses Groq's Llama model to provide legal assistance.
    """
    
    def __init__(self, qdrant_collection: str = "law_chunks", language: str = "english"):
        """Initialize the chatbot with all necessary components."""
        self.qdrant_collection = qdrant_collection
        self.language = language
        self.setup_config()
        self.setup_llm()
        self.setup_embeddings()
        self.setup_vector_store()
        self.setup_retriever()
        self.setup_prompts()
        self.setup_chain()
        
        # Initialize chat history
        self.chat_history = []
        self.max_history_length = 5  # Keep last 5 exchanges
        
    def setup_config(self):
        """Set up configuration from environment variables."""
        # Groq Configuration
        self.groq_api_key = os.getenv("GROQ_API_KEY")
        if not self.groq_api_key:
            raise ValueError("GROQ_API_KEY not found in environment variables")
        
        # Qdrant Configuration
        self.qdrant_url = os.getenv("QDRANT_URL", "http://localhost:6333")
        self.qdrant_api_key = os.getenv("QDRANT_API_KEY")
        
        # Model Configuration
        self.embedding_model_name = "intfloat/multilingual-e5-base"
        self.llm_model_name = "llama-3.3-70b-versatile"  
        
        print(f"{Fore.GREEN}✅ Configuration loaded successfully{Style.RESET_ALL}")
        
    def setup_llm(self):
        """Initialize the Groq LLM."""
        try:
            self.llm = ChatGroq(
                groq_api_key=self.groq_api_key,
                model_name=self.llm_model_name,
                temperature=0.1,  # Low temperature for more factual responses
                max_tokens=2048,
                timeout=60,
                max_retries=3
            )
            print(f"{Fore.GREEN}✅ Groq LLM initialized: {self.llm_model_name}{Style.RESET_ALL}")
        except Exception as e:
            print(f"{Fore.RED}❌ Failed to initialize Groq LLM: {e}{Style.RESET_ALL}")
            raise
            
    def setup_embeddings(self):
        """Initialize the embedding model."""
        try:
            self.embeddings = SentenceTransformerEmbeddings(
                model_name=self.embedding_model_name,
                model_kwargs={'device': 'cpu'},
                encode_kwargs={
                    'normalize_embeddings': True,
                    'convert_to_numpy': True
                }
            )
            
            # Also initialize the direct sentence transformer for query embedding
            from sentence_transformers import SentenceTransformer
            self.sentence_transformer = SentenceTransformer(self.embedding_model_name)
            
            print(f"{Fore.GREEN}✅ Embeddings initialized: {self.embedding_model_name}{Style.RESET_ALL}")
        except Exception as e:
            print(f"{Fore.RED}❌ Failed to initialize embeddings: {e}{Style.RESET_ALL}")
            raise
            
    def setup_vector_store(self):
        """Initialize connection to Qdrant vector store."""
        try:
            self.qdrant_client = QdrantClient(
                url=self.qdrant_url,
                api_key=self.qdrant_api_key
            )
            
            # Check if collection exists
            collections = [c.name for c in self.qdrant_client.get_collections().collections]
            if self.qdrant_collection not in collections:
                raise ValueError(f"Collection '{self.qdrant_collection}' not found in Qdrant")
            
            self.vector_store = Qdrant(
                client=self.qdrant_client,
                collection_name=self.qdrant_collection,
                embeddings=self.embeddings,
                content_payload_key="chunk",  # Use the 'chunk' field from your payload
                metadata_payload_key="metadata"
            )
            
            print(f"{Fore.GREEN}✅ Qdrant vector store connected: {self.qdrant_collection}{Style.RESET_ALL}")
        except Exception as e:
            print(f"{Fore.RED}❌ Failed to connect to Qdrant: {e}{Style.RESET_ALL}")
            raise
            
    def setup_retriever(self):
        """Set up the document retriever with search parameters."""
        # Create a custom retriever that uses our search_documents method
        from langchain.schema.runnable import Runnable
        
        class CustomRetriever(Runnable):
            def __init__(self, search_func):
                self.search_func = search_func
                super().__init__()
            
            def invoke(self, query: str, config=None) -> List[Document]:
                return self.search_func(query, k=5)
            
            def get_relevant_documents(self, query: str) -> List[Document]:
                return self.search_func(query, k=5)
        
        self.retriever = CustomRetriever(self.search_documents)
        print(f"{Fore.GREEN}✅ Document retriever configured{Style.RESET_ALL}")
        
    def setup_prompts(self):
        """Set up the prompt templates for the RAG system."""
        
        # System prompt for legal assistance
        self.system_prompt_en = """
        You are a knowledgeable legal assistant specializing in Italian law. 
Your role is to provide accurate, helpful, and well-reasoned legal information based on the provided legal documents.

GREETING HANDLING:
If the user greets you (hello, hi, good morning, etc.), respond warmly and ask what legal information they need help with and if he doesn't greet then skip to answering. For example:
"Hello! I'm your Italian Legal Assistant. I can help you with questions about Italian law, including contracts, employment law, corporate regulations, civil procedures, and more. What legal information can I assist you with today?"

IMPORTANT GUIDELINES:
1. Base your responses primarily on the provided legal context
2. If the context doesn't contain sufficient information, clearly state this limitation
3. ALWAYS cite the legal sources with complete details including:
   - Law name (both Italian and English if available)
   - Article number and title 
   - Source URL
4. Provide structured, clear explanations using simple headings (not markdown)
5. Use professional but accessible language
6. If asked about specific legal procedures, cite relevant articles or provisions
7. Distinguish between legal facts and interpretations
8. Remind users to consult qualified legal professionals for specific legal advice

RESPONSE STRUCTURE:
- Brief direct answer to the question
- Detailed explanation based on legal context

Legal Sources:
For each relevant document, include:
• Law Name: [Italian law name]
• English Name: [English translation if available]
• Article: [Article number and title]
• Source URL: [Official source link]

- Practical implications or considerations
- Disclaimer about consulting legal professionals

CITATION FORMAT:
Always format legal sources as:
📚 Source: [Law Name] | Article [Number]: [Title] | [English Law Name]
🔗 Official Source: [Source URL]

FORMATTING RULES:
- Do NOT use markdown formatting like ## or **
- Use simple text headings
- Use bullet points with • or -
- Keep formatting clean and readable
- For multiple sources, enter next line
- Always place URLs on separate lines starting with 🔗 for better clickability

Remember: You're providing legal information, not legal advice. Always include complete source citations.
"""

        self.system_prompt_it = """
        Tu sei un assistente legale esperto in diritto italiano.
Il tuo ruolo è fornire informazioni legali accurate, utili e ben motivate basandoti sui documenti legali forniti.

GESTIONE DEI SALUTI:
Se l’utente ti saluta (ciao, buongiorno, salve, ecc.), rispondi cordialmente e chiedi di quale informazione legale ha bisogno. Se non ti saluta, passa direttamente alla risposta. Ad esempio:
«Ciao! Sono il tuo Assistente Legale Italiano. Posso aiutarti con domande sul diritto italiano, inclusi contratti, diritto del lavoro, normativa societaria, procedura civile e altro ancora. Quale informazione legale posso fornirti oggi?»

LINEE GUIDA IMPORTANTI:
Basati principalmente sul contesto legale fornito
Se il contesto non contiene informazioni sufficienti, indica chiaramente questa limitazione
CITA SEMPRE le fonti legali con tutti i dettagli completi, inclusi:
Nome della legge (in italiano e in inglese, se disponibile)
Numero e titolo dell’articolo
URL della fonte ufficiale

Fornisci spiegazioni strutturate e chiare, usando titoli semplici (senza markdown)
Usa un linguaggio professionale ma comprensibile
Se ti viene chiesta una procedura specifica, cita gli articoli o le disposizioni pertinenti
Distingui tra fatti giuridici e interpretazioni
Ricorda all’utente di consultare un professionista legale qualificato per consulenze specifiche

STRUTTURA DELLA RISPOSTA:
Risposta breve e diretta alla domanda
Spiegazione dettagliata basata sul contesto legale

Fonti legali:
Per ogni documento pertinente, includi:
• Nome della legge: [Italian law name]
• Nome in inglese: [English translation if available]
• Articolo: [Article number and title]
• Source URL: [Official source link]
Implicazioni o considerazioni pratiche

Avvertenza sulla necessità di consultare professionisti legali

FORMATO DELLA CITAZIONE:
Indica sempre le fonti legali nel formato:
📚 Fonte: [Law Name] | Articolo [Number]: [Title] | [English Law Name]
🔗 Fonte ufficiale: [URL]

REGOLE DI FORMATTAZIONE:
NON usare formattazioni markdown come ## o **
Usa titoli semplici di testo
Usa punti elenco con • o -
Mantieni una formattazione pulita e leggibile
Per più fonti, vai a capo
Inserisci sempre gli URL su una riga separata che inizi con 🔗 per facilitarne il click

Ricorda: stai fornendo informazioni legali, non consulenza legale. Includi sempre citazioni complete delle fonti."""

        # RAG prompt template with chat history
        self.rag_template = """System: {system_prompt}

Previous Conversation (for context):
{chat_history}

Legal Context:
{context}

Human Question: {question}

Legal Assistant Response:"""

        self.rag_prompt = ChatPromptTemplate.from_template(self.rag_template)
        
        print(f"{Fore.GREEN}✅ Prompt templates configured{Style.RESET_ALL}")
        
    def setup_chain(self):
        """Set up the RAG chain that combines retrieval and generation."""
        
        def format_docs(docs: List[Document]) -> str:
            """Format retrieved documents for the prompt."""
            if not docs:
                return "No relevant legal documents found."
            
            formatted_docs = []
            for i, doc in enumerate(docs, 1):
                # Robust content extraction with multiple fallbacks
                content = None
                if hasattr(doc, 'page_content') and doc.page_content:
                    content = str(doc.page_content)
                elif hasattr(doc, 'content') and doc.content:
                    content = str(doc.content)
                
                # If still no content, skip this document
                if not content or content.strip() == "":
                    print(f"⚠️ Warning: Skipping document {i} due to empty content")
                    continue
                
                metadata = doc.metadata if hasattr(doc, 'metadata') else {}
                
                # Extract detailed legal metadata with exact field names
                law_info = []
                source_url_info = []
                
                # Law names (Italian and English) - exact field extraction
                law_name = metadata.get('law_name', '')
                english_law_name = metadata.get('english_law_name', '')
                
                if law_name:
                    law_info.append(f"Italian Law: {law_name}")
                if english_law_name:
                    law_info.append(f"English Law: {english_law_name}")
                
                # Article information - exact field extraction
                article_number = metadata.get('article_number', '')
                article_title = metadata.get('article_title', '')
                
                if article_number:
                    law_info.append(f"Article Number: {article_number}")
                if article_title:
                    law_info.append(f"Article Title: {article_title}")
                
                # Source URL - extract separately for clickable formatting
                source_url = metadata.get('source_url', '')
                if source_url:
                    source_url_info.append(f"🔗 Official Source: {source_url}")
                
                # Document ID for reference
                # original_chunk_id = metadata.get('original_chunk_id', '')
                # if original_chunk_id:
                #     law_info.append(f"Reference ID: {original_chunk_id}")
                
                # Additional metadata that might be useful
                # chunk_id = metadata.get('chunk_id', '')
                # if chunk_id:
                #     law_info.append(f"Chunk ID: {chunk_id}")
                
                source_str = " | ".join(law_info) if law_info else "Legal Document"
                
                # Format the document with enhanced metadata and clickable URLs
                url_section = "\n".join(source_url_info) if source_url_info else ""
                formatted_doc = f"""Document {i}:
📚 Legal Source Information: {source_str}
{url_section}
📄 Legal Content: {content}

---"""
                formatted_docs.append(formatted_doc)
            
            if not formatted_docs:
                return "No valid legal documents could be retrieved."
            
            return "\n".join(formatted_docs)
        
        # Create a simple function to get context
        def get_context(question):
            docs = self.search_documents(question, k=5)
            return format_docs(docs)
        
        # Create a function to format chat history
        def get_chat_history():
            if not self.chat_history:
                return "No previous conversation."
            
            history_text = []
            for i, exchange in enumerate(self.chat_history, 1):
                history_text.append(f"Q{i}: {exchange['question']}")
                history_text.append(f"A{i}: {exchange['answer'][:200]}...")
            
            return "\n".join(history_text)
        
        # Create the RAG chain using a simpler approach
        self.rag_chain = (
            {
                "context": lambda x: get_context(x),
                "question": RunnablePassthrough(),
                "system_prompt": lambda _: self.system_prompt,
                "chat_history": lambda _: get_chat_history()
            }
            | self.rag_prompt
            | self.llm
            | StrOutputParser()
        )
        
        print(f"{Fore.GREEN}✅ RAG chain configured{Style.RESET_ALL}")
        
    def search_documents(self, query: str, k: int = 5) -> List[Document]:
        """Search for relevant documents in the vector store."""
        try:
            print(f"{Fore.CYAN}🔎 Using collection for retrieval: {self.qdrant_collection}{Style.RESET_ALL}")  # <-- Add this line

            # Use direct sentence transformer to create query embedding
            formatted_query = f"query: {query.strip()}"
            query_embedding = self.sentence_transformer.encode(formatted_query, convert_to_numpy=True).tolist()
            
            
            
            search_results = self.qdrant_client.search(
                collection_name=self.qdrant_collection,
                query_vector=query_embedding,
                limit=k,
                score_threshold=0.3
            )
            
            documents = []
            for result in search_results:
                payload = result.payload
                
                # Extract content from the 'chunk' field with robust error handling
                content = payload.get('chunk')
                if not content or content is None:
                    # Fallback to other possible content fields
                    content = payload.get('text') or payload.get('content') or payload.get('page_content')
                
                if not content or str(content).strip() == "":
                    print(f"⚠️ Warning: Empty content for document {payload.get('chunk_id', 'Unknown')}")
                    continue
                
                # Ensure content is a string
                content = str(content).strip()
                
                # Create metadata dict with all available fields except 'chunk'
                metadata = {k: v for k, v in payload.items() if k != 'chunk'}
                
                # Create Document object with robust error handling
                try:
                    doc = Document(
                        page_content=content,
                        metadata=metadata
                    )
                    documents.append(doc)
                except Exception as doc_error:
                    print(f"⚠️ Warning: Could not create document object: {doc_error}")
                    continue
            
            print(f"✅ Successfully retrieved {len(documents)} documents")
            return documents
            
        except Exception as e:
            print(f"{Fore.RED}❌ Error searching documents: {e}{Style.RESET_ALL}")
            return []
            
    def add_to_history(self, question: str, answer: str):
        """Add an exchange to chat history."""
        self.chat_history.append({
            "question": question,
            "answer": answer,
            "timestamp": time.time()
        })
        
        # Keep only the last N exchanges
        if len(self.chat_history) > self.max_history_length:
            self.chat_history = self.chat_history[-self.max_history_length:]
    
    def clear_history(self):
        """Clear the chat history."""
        self.chat_history = []

    def get_response(self, question: str, collection: str = "law_chunks", language: str = "english") -> str:
        """Get a response from the RAG chatbot."""
        try:
            # Switch collection if needed
            if collection != self.qdrant_collection:
                self.qdrant_collection = collection
                self.setup_vector_store()

            # Update language for this response
            self.language = language
            print(f"{Fore.YELLOW}🌐 Using language for response: {self.language}{Style.RESET_ALL}")
            print(f"{Fore.YELLOW}🔍 Searching for relevant legal documents...{Style.RESET_ALL}")
            
            # First, test document retrieval directly
            docs = self.search_documents(question, k=5)
            
            if not docs:
                return "I apologize, but I couldn't find any relevant legal documents for your question. Please try rephrasing your query or asking about a different legal topic."
            
            print(f"{Fore.GREEN}✅ Found {len(docs)} relevant documents{Style.RESET_ALL}")
            
            # Determine the correct system prompt based on language
            if self.language.lower() == "italian":
                self.system_prompt = self.system_prompt_it
            else:
                self.system_prompt = self.system_prompt_en
            
            # Get response from RAG chain
            response = self.rag_chain.invoke(question)
            
            # Add to chat history
            self.add_to_history(question, response)

            # Print chat history after each response
            print(f"\n{Fore.CYAN}📚 Current Conversation History:{Style.RESET_ALL}")
            for i, exchange in enumerate(self.chat_history, 1):
                print(f"{Fore.YELLOW}Q{i}: {exchange['question']}{Style.RESET_ALL}")
                print(f"{Fore.GREEN}A{i}: {exchange['answer'][:300]}...{Style.RESET_ALL}")

            return response

        except Exception as e:
            error_msg = f"❌ Error generating response: {e}"
            print(f"{Fore.RED}{error_msg}{Style.RESET_ALL}")
            return f"I apologize, but I encountered an error while processing your question: {str(e)}"
            
    def display_welcome(self):
        """Display welcome message and instructions."""
        print(f"\n{Back.BLUE}{Fore.WHITE} LEGAL RAG CHATBOT {Style.RESET_ALL}")
        print(f"{Fore.CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━{Style.RESET_ALL}")
        print(f"{Fore.GREEN}Welcome to the Italian Legal Assistant!{Style.RESET_ALL}")
        print(f"{Fore.WHITE}This chatbot provides legal information based on Italian legal documents.{Style.RESET_ALL}")
        print(f"\n{Fore.YELLOW}Available Commands:{Style.RESET_ALL}")
        print(f"{Fore.WHITE}  • Type your legal question and press Enter{Style.RESET_ALL}")
        print(f"{Fore.WHITE}  • Type 'search: <query>' to search documents directly{Style.RESET_ALL}")
        print(f"{Fore.WHITE}  • Type 'history' to view recent conversation history{Style.RESET_ALL}")
        print(f"{Fore.WHITE}  • Type 'clear' to clear conversation history{Style.RESET_ALL}")
        print(f"{Fore.WHITE}  • Type 'help' for this message{Style.RESET_ALL}")
        print(f"{Fore.WHITE}  • Type 'quit' or 'exit' to end the session{Style.RESET_ALL}")
        print(f"\n{Fore.RED}⚠️  DISCLAIMER: This is for informational purposes only. Consult a qualified legal professional for legal advice.{Style.RESET_ALL}")
        print(f"{Fore.CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━{Style.RESET_ALL}\n")
        
    def display_thinking(self):
        """Display thinking animation."""
        thinking_chars = "⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏"
        for _ in range(10):
            for char in thinking_chars:
                print(f"\r{Fore.YELLOW}{char} Processing your question...{Style.RESET_ALL}", end="", flush=True)
                time.sleep(0.1)
        print(f"\r{' ' * 50}\r", end="")
        
    def run_chat(self):
        """Run the interactive chat interface."""
        self.display_welcome()
        
        while True:
            try:
                # Get user input
                user_input = input(f"{Fore.BLUE}Legal Question: {Style.RESET_ALL}").strip()
                
                if not user_input:
                    continue
                    
                # Handle commands
                if user_input.lower() in ['quit', 'exit', 'q']:
                    print(f"{Fore.GREEN}Thank you for using the Legal Assistant. Goodbye!{Style.RESET_ALL}")
                    break
                    
                elif user_input.lower() == 'help':
                    self.display_welcome()
                    continue
                    
                elif user_input.lower() == 'history':
                    if self.chat_history:
                        print(f"\n{Fore.CYAN}📚 Recent Conversation History:{Style.RESET_ALL}")
                        for i, exchange in enumerate(self.chat_history, 1):
                            print(f"\n{Fore.YELLOW}Q{i}: {exchange['question']}{Style.RESET_ALL}")
                            print(f"{Fore.GREEN}A{i}: {exchange['answer'][:300]}...{Style.RESET_ALL}")
                    else:
                        print(f"{Fore.YELLOW}No conversation history yet.{Style.RESET_ALL}")
                    continue
                    
                elif user_input.lower() == 'clear':
                    self.chat_history = []
                    print(f"{Fore.GREEN}✅ Conversation history cleared.{Style.RESET_ALL}")
                    continue
                    
                elif user_input.lower().startswith('search:'):
                    query = user_input[7:].strip()
                    if query:
                        print(f"\n{Fore.YELLOW}🔍 Searching for: {query}{Style.RESET_ALL}")
                        docs = self.search_documents(query)
                        
                        if docs:
                            print(f"{Fore.GREEN}Found {len(docs)} relevant documents:{Style.RESET_ALL}\n")
                            for i, doc in enumerate(docs, 1):
                                metadata = doc.metadata
                                
                                # Extract detailed metadata with exact field names
                                law_name = metadata.get('law_name', 'Unknown Law')
                                english_law_name = metadata.get('english_law_name', '')
                                article_number = metadata.get('article_number', '')
                                article_title = metadata.get('article_title', '')
                                source_url = metadata.get('source_url', '')
                                chunk_id = metadata.get('original_chunk_id', 'Unknown ID')
                                content_preview = doc.page_content[:200] + "..." if len(doc.page_content) > 200 else doc.page_content
                                
                                print(f"{Fore.CYAN}📄 Document {i}:{Style.RESET_ALL}")
                                print(f"  📚 Italian Law: {law_name}")
                                if english_law_name:
                                    print(f"  🌍 English Law: {english_law_name}")
                                if article_number:
                                    print(f"  📋 Article Number: {article_number}")
                                if article_title:
                                    print(f"  📝 Article Title: {article_title}")
                                if source_url:
                                    print(f"  🔗 Official Source: {source_url}")
                                print(f"  🆔 Document ID: {chunk_id}")
                                print(f"  📄 Content Preview: {content_preview}\n")
                        else:
                            print(f"{Fore.RED}No relevant documents found.{Style.RESET_ALL}")
                    continue
                
                # Process regular question
                print(f"\n{Fore.YELLOW}🤔 Analyzing your question...{Style.RESET_ALL}")
                
                # Get and display response
                response = self.get_response(user_input)
                
                print(f"\n{Fore.GREEN}📋 Legal Assistant Response:{Style.RESET_ALL}")
                print(f"{Fore.WHITE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━{Style.RESET_ALL}")
                print(f"{response}")
                print(f"{Fore.WHITE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━{Style.RESET_ALL}\n")
                
            except KeyboardInterrupt:
                print(f"\n{Fore.YELLOW}Session interrupted. Goodbye!{Style.RESET_ALL}")
                break
            except Exception as e:
                print(f"{Fore.RED}❌ Unexpected error: {e}{Style.RESET_ALL}")
                print(f"{Fore.YELLOW}Please try again or contact support if the issue persists.{Style.RESET_ALL}")

def main():
    """Main function to initialize and run the chatbot."""
    try:
        print(f"{Fore.YELLOW}🚀 Initializing Legal RAG Chatbot...{Style.RESET_ALL}")
        
        # Initialize chatbot
        chatbot = LegalRAGChatbot()
        
        print(f"{Fore.GREEN}✅ Chatbot initialized successfully!{Style.RESET_ALL}")
        
        # Run interactive chat
        chatbot.run_chat()
        
    except KeyboardInterrupt:
        print(f"\n{Fore.YELLOW}Initialization interrupted. Goodbye!{Style.RESET_ALL}")
    except Exception as e:
        print(f"{Fore.RED}❌ Failed to initialize chatbot: {e}{Style.RESET_ALL}")
        print(f"{Fore.YELLOW}Please check your configuration and try again.{Style.RESET_ALL}")
        sys.exit(1)

if __name__ == "__main__":
    main()
