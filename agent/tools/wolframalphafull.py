from langchain.tools import BaseTool
import requests
import urllib.parse
import os

from dotenv import load_dotenv

load_dotenv()

app_id = os.getenv('WOLFRAM_ALPHA_APPID')

# Wolfram alpha with full result
class WolframAlphaFull(BaseTool):
    name="WolframAlpha"
    description="Wolfram Alpha is a computational knowledge engine that can answer questions and do computations. ALWAYS use it for anything involving math, do not do any math yourself, ex. always use it to verify examples you give and to check EVERY step of mathematical work you do."

    def _run(self, query):
        try:
            query = urllib.parse.quote_plus(query)
            query_url = f"http://api.wolframalpha.com/v2/query?" \
                f"appid={app_id}" \
                f"&input={query}" \
                f"&podstate=Result__Step-by-step+solution" \
                "&format=plaintext" \
                f"&output=json"
            
            r = requests.get(query_url).json()

            result = ""
            for pod in r["queryresult"]["pods"]:
                data = pod["subpods"]
                result += '\n\n'.join([f'{pod["title"]}:\n{datum["plaintext"]}\n' for datum in data if datum["plaintext"]])

            return result
        
        except Exception as e:
            print(f"Exception occured calling Wolfram Alpha: {e}")

            return "There was an error calling Wolfram Alpha."
