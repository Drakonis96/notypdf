import os
import json
import requests
from typing import Dict, Any, Optional
import logging

logger = logging.getLogger(__name__)

class TranslationService:
    def __init__(self):
        self.openai_api_key = os.environ.get("OPENAI_API_KEY")
        self.openrouter_api_key = os.environ.get("OPENROUTER_API_KEY")
        self.gemini_api_key = os.environ.get("GEMINI_API_KEY")
        self.deepseek_api_key = os.environ.get("DEEPSEEK_API_KEY")
    
    def get_api_key(self, provider: str) -> Optional[str]:
        """Get API key for the specified provider"""
        keys = {
            'openai': self.openai_api_key,
            'openrouter': self.openrouter_api_key,
            'gemini': self.gemini_api_key,
            'deepseek': self.deepseek_api_key
        }
        return keys.get(provider)
    
    def test_connection(self, provider: str, model: str) -> Dict[str, Any]:
        """Test connection to the specified translation provider"""
        try:
            api_key = self.get_api_key(provider)
            if not api_key:
                return {
                    "success": False,
                    "message": f"No API key configured for {provider}"
                }
            
            # Test with a simple message
            test_text = "Hello"
            result = self.translate(text=test_text, provider=provider, model=model, target_language="Spanish")
            
            if result.get("success"):
                return {
                    "success": True,
                    "message": f"✅ {provider.title()} API connection successful!"
                }
            else:
                return {
                    "success": False,
                    "message": f"❌ {provider.title()} API test failed: {result.get('message', 'Unknown error')}"
                }
                
        except Exception as e:
            logger.error(f"Translation test failed for {provider}: {str(e)}")
            return {
                "success": False,
                "message": f"❌ Connection test failed: {str(e)}"
            }
    
    def translate(self, text: str, provider: str, model: str, target_language: str) -> Dict[str, Any]:
        """Translate text using the specified provider"""
        try:
            api_key = self.get_api_key(provider)
            if not api_key:
                return {
                    "success": False,
                    "message": f"No API key configured for {provider}"
                }
            
            if provider == 'openai':
                return self._translate_openai(text, model, target_language, api_key)
            elif provider == 'openrouter':
                return self._translate_openrouter(text, model, target_language, api_key)
            elif provider == 'gemini':
                return self._translate_gemini(text, model, target_language, api_key)
            elif provider == 'deepseek':
                return self._translate_deepseek(text, model, target_language, api_key)
            else:
                return {
                    "success": False,
                    "message": f"Unsupported provider: {provider}"
                }
                
        except Exception as e:
            logger.error(f"Translation failed: {str(e)}")
            return {
                "success": False,
                "message": f"Translation failed: {str(e)}"
            }
    
    def _translate_openai(self, text: str, model: str, target_language: str, api_key: str) -> Dict[str, Any]:
        """Translate using OpenAI API"""
        url = "https://api.openai.com/v1/chat/completions"
        prompt = f"Translate the following text to {target_language}. Format the translation as markdown, preserving paragraph breaks, titles, and other formatting. Return only the translated text formatted as markdown.\n\n{text}"
        
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }
        
        data = {
            "model": model,
            "messages": [
                {"role": "system", "content": "You are a translation assistant. Always format your translations as markdown to preserve structure, paragraph breaks, and titles."},
                {"role": "user", "content": prompt}
            ],
            "max_tokens": 2048,
            "temperature": 0.2
        }
        
        response = requests.post(url, headers=headers, json=data, timeout=30)
        
        if response.status_code == 200:
            result = response.json()
            if result.get("choices") and result["choices"][0].get("message"):
                return {
                    "success": True,
                    "translated_text": result["choices"][0]["message"]["content"].strip()
                }
        
        return {
            "success": False,
            "message": f"OpenAI API error: {response.status_code} - {response.text}"
        }
    
    def _translate_openrouter(self, text: str, model: str, target_language: str, api_key: str) -> Dict[str, Any]:
        """Translate using OpenRouter API"""
        url = "https://openrouter.ai/api/v1/chat/completions"
        prompt = f"Translate the following text to {target_language}. Format the translation as markdown, preserving paragraph breaks, titles, and other formatting. Return only the translated text formatted as markdown.\n\n{text}"
        
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }
        
        data = {
            "model": model,
            "messages": [
                {"role": "system", "content": "You are a translation assistant. Always format your translations as markdown to preserve structure, paragraph breaks, and titles."},
                {"role": "user", "content": prompt}
            ],
            "max_tokens": 2048,
            "temperature": 0.2
        }
        
        response = requests.post(url, headers=headers, json=data, timeout=30)
        
        if response.status_code == 200:
            result = response.json()
            if result.get("choices") and result["choices"][0].get("message"):
                return {
                    "success": True,
                    "translated_text": result["choices"][0]["message"]["content"].strip()
                }
        
        return {
            "success": False,
            "message": f"OpenRouter API error: {response.status_code} - {response.text}"
        }
    
    def _translate_gemini(self, text: str, model: str, target_language: str, api_key: str) -> Dict[str, Any]:
        """Translate using Gemini API"""
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}"
        prompt = f"Translate the following text to {target_language}. Format the translation as markdown, preserving paragraph breaks, titles, and other formatting. Return only the translated text formatted as markdown.\n\n{text}"
        
        headers = {
            "Content-Type": "application/json"
        }
        
        data = {
            "contents": [
                {
                    "role": "user",
                    "parts": [{"text": prompt}]
                }
            ],
            "generationConfig": {
                "temperature": 0.2,
                "maxOutputTokens": 2048
            },
            "systemInstruction": {
                "parts": [{"text": "You are a translation assistant. Always format your translations as markdown to preserve structure, paragraph breaks, and titles."}]
            }
        }
        
        response = requests.post(url, headers=headers, json=data, timeout=30)
        
        if response.status_code == 200:
            result = response.json()
            if (result.get("candidates") and 
                result["candidates"][0].get("content") and 
                result["candidates"][0]["content"].get("parts") and
                result["candidates"][0]["content"]["parts"][0].get("text")):
                return {
                    "success": True,
                    "translated_text": result["candidates"][0]["content"]["parts"][0]["text"].strip()
                }
        
        return {
            "success": False,
            "message": f"Gemini API error: {response.status_code} - {response.text}"
        }
    
    def _translate_deepseek(self, text: str, model: str, target_language: str, api_key: str) -> Dict[str, Any]:
        """Translate using DeepSeek API"""
        url = "https://api.deepseek.com/chat/completions"
        prompt = f"Translate the following text to {target_language}. Format the translation as markdown, preserving paragraph breaks, titles, and other formatting. Return only the translated text formatted as markdown.\n\n{text}"
        
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }
        
        data = {
            "model": model,
            "messages": [
                {"role": "system", "content": "You are a translation assistant. Always format your translations as markdown to preserve structure, paragraph breaks, and titles."},
                {"role": "user", "content": prompt}
            ],
            "max_tokens": 2048,
            "temperature": 0.2
        }
        
        response = requests.post(url, headers=headers, json=data, timeout=30)
        
        if response.status_code == 200:
            result = response.json()
            if result.get("choices") and result["choices"][0].get("message"):
                return {
                    "success": True,
                    "translated_text": result["choices"][0]["message"]["content"].strip()
                }
        
        return {
            "success": False,
            "message": f"DeepSeek API error: {response.status_code} - {response.text}"
        }

# Global translation service instance
translation_service = TranslationService()