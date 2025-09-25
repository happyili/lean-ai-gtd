from openai import OpenAI
from langchain_openai import ChatOpenAI
import os
from dotenv import load_dotenv
import logging

# 加载环境变量
load_dotenv()

# 初始化配置
"""
配置参数模块，用于存储系统的配置参数
"""

class Config:
    # OpenRouter Models
    OPENROUTER_API_KEY = os.getenv('OPENROUTER_API_KEY', '')
    OPENROUTER_API_URL = "https://openrouter.ai/api/v1"
    OPENROUTER_DEEPSEEK_MODEL = "deepseek/deepseek-chat"
    OPENROUTER_GEMINI25_FREE_MODEL = "google/gemini-2.5-pro-exp-03-25:free"


config = Config()

# 配置日志
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def get_openrouter_client():
    """创建并返回OpenRouter客户端"""
    return OpenAI(
        base_url=config.OPENROUTER_API_URL,
        api_key=config.OPENROUTER_API_KEY,
    )

def get_openrounter_chat_client(model: str):
    return ChatOpenAI(
      base_url=config.OPENROUTER_API_URL,
      openai_api_key=config.OPENROUTER_API_KEY,
      model_name=model
      # temperature=temperature
)

def query_openrounter(model: str,prompt: str):
    """使用OpenRouter查询模型"""
    try:
        client = get_openrouter_client()
        completion = client.chat.completions.create(
            model=model,
            messages=[
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            temperature=0.7
        )
        
        response = completion.choices[0].message.content
        logger.info(f"{model} response: {response}")
        return response
        
    except Exception as e:
        logger.error(f"Error querying {model}: {str(e)}")
        raise

# if __name__ == "__main__":
#     # 示例用法
#     response = query_openrounter(config.OPENROUTER_DEEPSEEK_MODEL, "请介绍一下DEEPSEEK v0324模型的特点")
#     print(response)