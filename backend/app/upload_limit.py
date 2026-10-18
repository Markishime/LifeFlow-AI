from starlette.exceptions import HTTPException

from app.core import settings


class UploadLimit:
    """Bound multipart input before the framework spools a file to disk."""

    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http" or scope.get("path") != "/api/v1/documents/upload":
            return await self.app(scope, receive, send)
        maximum = settings().max_upload_bytes + 65536
        consumed = 0

        async def bounded_receive():
            nonlocal consumed
            message = await receive()
            consumed += len(message.get("body", b""))
            if consumed > maximum:
                raise HTTPException(413, "Upload exceeds the allowed request size")
            return message

        await self.app(scope, bounded_receive, send)
