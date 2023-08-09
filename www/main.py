import os
from dotenv import load_dotenv
import streamlit as st
import time
from agent.cache import LRUCache
from agent.chain import ConversationCache, BloomChain
import asyncio


def init():
    global BLOOM_CHAIN, \
    CACHE, \
    THOUGHT_CHANNEL
    
    CACHE = LRUCache(50)
    THOUGHT_CHANNEL = os.environ["THOUGHT_CHANNEL_ID"]
    BLOOM_CHAIN = BloomChain()
    
load_dotenv()
token = os.environ['BOT_TOKEN']

init()

st.set_page_config(
    page_title="Bloom - Reading. Reimagined.",
    layout="wide",
    initial_sidebar_state="expanded",
    page_icon="https://bloombot.ai/wp-content/uploads/2023/02/bloom-fav-icon@10x-200x200.png"
)
st.image("https://bloombot.ai/wp-content/uploads/2023/02/Bloom-Logo@2x-1.svg", width=200)
st.title("Bloom - Reading. Reimagined.")
st.sidebar.header("See my thoughts below!")

st.markdown("""
<style>
    @import url('https://fonts.googleapis.com/css2?family=Nokora&family=Space+Grotesk&display=swap');
    
    p {
        font-family: 'Space Grotesk', sans-serif !important;
    }

    h1, h2, h3, h4, h5, h6 {
        font-family: 'Nokora', sans-serif;
    }
    
    #bloom-reading-reimagined {
        font-weight: 400;
    }
    
</style>""", unsafe_allow_html=True)



if 'messages' not in st.session_state:
    st.session_state.messages = [{
        "role": "assistant",
        "content": """
I’m your Aristotelian learning companion — here to help you follow your curiosity in whatever direction you like. My engineering makes me extremely receptive to your needs and interests. You can reply normally, and I’ll always respond!

If I'm off track, just say so!

Need to leave or just done chatting? Let me know! I’m conversational by design so I’ll say goodbye 😊."""
    }]

if 'local_chain' not in st.session_state:
    st.session_state.local_chain = ConversationCache()
    

for message in st.session_state.messages:
    with st.chat_message(message['role'], avatar=(None if message['role'] == 'user' else "https://bloombot.ai/wp-content/uploads/2023/02/bloom-fav-icon@10x-200x200.png")):
        st.markdown(message['content'])


# thought, response = '', ''
# async def chat_and_save(local_chain: ConversationCache, input: str) -> None:
#         global thought, response
#         bloom_chain =  BLOOM_CHAIN # if local_chain.conversation_type == "discuss" else WORKSHOP_RESPONSE_CHAIN
#         thought, response = await bloom_chain.chat(local_chain, input)
#         return None

async def stream_and_save(local_chain: ConversationCache, input: str) -> None:
    thought_iterator = BLOOM_CHAIN.think(st.session_state.local_chain.thought_memory, prompt)

    thought_placeholder = st.sidebar.empty()
    thought_placeholder.markdown("Thinking...")
    full_thought = ""
    async for thought in thought_iterator:
        full_thought += thought.content
        thought_placeholder.markdown(full_thought)
    BLOOM_CHAIN.save_thought(full_thought, st.session_state.local_chain)
    
    response_iterator = BLOOM_CHAIN.respond(st.session_state.local_chain.response_memory, thought, prompt)
    with st.chat_message('assistant', avatar="https://bloombot.ai/wp-content/uploads/2023/02/bloom-fav-icon@10x-200x200.png"):
        response_placeholder = st.empty()
        response_placeholder.markdown("Responding...")
        full_response = ""
        async for response in response_iterator:
            full_response += response.content
            response_placeholder.markdown(full_response)
    BLOOM_CHAIN.save_response(full_response, st.session_state.local_chain)
    
    st.session_state.messages.append({
        "role": "assistant",    
        "content": response
    })
    
        

if prompt := st.chat_input("hello!"):
    with st.chat_message('user'):
        st.markdown(prompt)
    st.session_state.messages.append({
        'role': 'user',
        'content': prompt
    })
    asyncio.run(stream_and_save(st.session_state.local_chain, prompt))




    
