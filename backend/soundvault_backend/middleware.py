from django.conf import settings


class SecurityHeadersMiddleware:
    """
    Add selected security headers without introducing extra dependencies.
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)

        csp_policy = getattr(settings, "CONTENT_SECURITY_POLICY", None)
        if csp_policy:
            response.setdefault("Content-Security-Policy", csp_policy)

        permissions_policy = getattr(settings, "PERMISSIONS_POLICY", None)
        if permissions_policy:
            response.setdefault("Permissions-Policy", permissions_policy)

        referrer_policy = getattr(settings, "REFERRER_POLICY", None)
        if referrer_policy:
            response.setdefault("Referrer-Policy", referrer_policy)

        # SecurityMiddleware sets this when SECURE_CONTENT_TYPE_NOSNIFF is True,
        # but setdefault keeps the header present even if the middleware order changes.
        response.setdefault("X-Content-Type-Options", "nosniff")

        return response
