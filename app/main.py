from fastapi import FastAPI

from app.api.routes import router

app = FastAPI(
    title="VAForge",
    version="0.1.0",
    description="Ocrolus for VA loans — built by veterans, for veterans.",
)
app.include_router(router)


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok", "service": "vaforge"}
