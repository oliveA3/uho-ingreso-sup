from rest_framework.renderers import JSONRenderer

_ENVELOPE_KEYS = {"success", "data", "error"}


class EnvelopeJSONRenderer(JSONRenderer):
    """Wraps every DRF response body in the {success, data, error} envelope
    required by the API standard, so individual views don't have to build it
    by hand. Status code alone decides success vs. error.
    """

    def render(self, data, accepted_media_type=None, renderer_context=None):
        renderer_context = renderer_context or {}
        response = renderer_context.get("response")
        status_code = response.status_code if response is not None else 200

        if status_code == 204 or data is None and status_code == 204:
            return b""

        if isinstance(data, dict) and _ENVELOPE_KEYS <= data.keys():
            envelope = data
        elif 200 <= status_code < 400:
            envelope = {"success": True, "data": data, "error": None}
        else:
            envelope = {"success": False, "data": None, "error": data}

        return super().render(envelope, accepted_media_type, renderer_context)
