"""
Authentication Middleware for SaaS Platform
Enforces login-first access control across the entire application
"""


class LoginRequiredMiddleware:
    """
    Middleware that requires authentication for all pages except:
    - Login page
    - Register page
    - Password reset pages
    - Static files (development)
    - Media files (development)
    - Admin panel
    """

    def __init__(self, get_response):
        self.get_response = get_response
        # URLs that don't require authentication
        self.exempt_urls = [
            '/login/',
            '/register/',
            '/logout/',
            '/admin/',
            '/static/',
            '/media/',
            '/password-reset/',
            '/password-reset/done/',
            '/reset/',
            '/reset/done/',
            '/about/',
            '/contact/',
            '/careers/',
            '/privacy-policy/',
            '/terms-of-service/',
            '/cookie-policy/',
            '/home/',
        ]

    def __call__(self, request):
        # If user is not authenticated and path is not exempt, redirect to login
        if not self.is_exempt(request.path):
            if not request.user.is_authenticated:
                from django.shortcuts import redirect
                response = redirect('login')
                response['Cache-Control'] = 'no-cache, no-store, must-revalidate, private'
                response['Pragma'] = 'no-cache'
                response['Expires'] = '0'
                return response
        
        # If user is authenticated and trying to access login/register, redirect to home
        if request.user.is_authenticated and request.path in ['/login/', '/register/']:
            from django.shortcuts import redirect
            return redirect('home')

        response = self.get_response(request)
        # Add no-cache headers to all responses for authenticated users
        if request.user.is_authenticated:
            response['Cache-Control'] = 'no-cache, no-store, must-revalidate, private'
            response['Pragma'] = 'no-cache'
            response['Expires'] = '0'
        return response

    def is_exempt(self, path):
        """
        Check if the given path is exempt from authentication
        """
        # Check exact matches
        if path in self.exempt_urls:
            return True
        
        # Check if path starts with any exempt prefix
        for exempt in self.exempt_urls:
            if path.startswith(exempt):
                return True
        
        return False