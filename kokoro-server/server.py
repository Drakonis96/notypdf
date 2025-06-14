from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from fastapi.responses import StreamingResponse
from kokoro import KPipeline
import io
import soundfile as sf

# List of available voices from Kokoro
VOICES = [
    'af_alloy','af_aoede','af_bella','af_heart','af_jessica','af_kore','af_nicole','af_nova','af_river','af_sarah','af_sky',
    'am_adam','am_echo','am_eric','am_fenrir','am_liam','am_michael','am_onyx','am_puck','am_santa',
    'bf_alice','bf_emma','bf_isabella','bf_lily',
    'bm_daniel','bm_fable','bm_george','bm_lewis',
    'ef_dora','em_alex','em_santa',
    'ff_siwis',
    'hf_alpha','hf_beta','hm_omega','hm_psi',
    'if_sara','im_nicola',
    'jf_alpha','jf_gongitsune','jf_nezumi','jf_tebukuro','jm_kumo',
    'pf_dora','pm_alex','pm_santa',
    'zf_xiaobei','zf_xiaoni','zf_xiaoxiao','zf_xiaoyi',
    'zm_yunjian','zm_yunxi','zm_yunxia','zm_yunyang'
]

LANG_CODES = sorted(set(v[0] for v in VOICES))
PIPELINES = {c: KPipeline(lang_code=c) for c in LANG_CODES}

app = FastAPI()
app.add_middleware(CORSMiddleware, allow_origins=['*'], allow_methods=['*'], allow_headers=['*'])

class TTSRequest(BaseModel):
    text: str
    voice: str
    speed: float = 1.0

@app.get('/voices')
def list_voices():
    return {'voices': VOICES}

@app.post('/speak')
async def speak(req: TTSRequest):
    if req.voice not in VOICES:
        return {'error': 'voice not available'}
    pipeline = PIPELINES[req.voice[0]]
    pack = pipeline.load_voice(req.voice)
    audio_data = None
    for _, _, audio in pipeline(req.text, voice=req.voice, speed=req.speed):
        if audio is not None:
            audio_data = audio.numpy()
            break
    if audio_data is None:
        return {'error': 'no audio'}
    buf = io.BytesIO()
    sf.write(buf, audio_data, 24000, format='wav')
    buf.seek(0)
    return StreamingResponse(buf, media_type='audio/wav')
