from rest_framework import status
from rest_framework.exceptions import AuthenticationFailed
from rest_framework.response import Response

from apps.accounts.exceptions import AccountAuthenticationError
from apps.accounts.views import AuthenticatedAPIView
from apps.statuses.exceptions import StatusFollowError
from apps.statuses.serializers import StatusFollowSerializer
from apps.statuses.services.status_follow_service import accept_follow_request, get_follow_for_user, reject_follow_request, unfollow
from apps.statuses.throttles import StatusUserThrottle
from apps.statuses.views_refactor.common import follow_error_response, unauthorized_response


class StatusFollowDetailView(AuthenticatedAPIView):
    throttle_classes = [StatusUserThrottle]

    def get(self, request, follow_id):
        try:
            authenticated_user = self.get_authenticated_user(request)
            follow = get_follow_for_user(user_id=str(authenticated_user.id), follow_id=str(follow_id))
        except (AccountAuthenticationError, AuthenticationFailed):
            return unauthorized_response()
        except StatusFollowError as error:
            return follow_error_response(error)
        return Response({"follow": StatusFollowSerializer(follow).data}, status=status.HTTP_200_OK)

    def delete(self, request, follow_id):
        try:
            authenticated_user, access_token = self.get_authenticated_user_and_access_token(request)
            unfollow(user_id=str(authenticated_user.id), access_token=access_token, follow_id=str(follow_id))
        except (AccountAuthenticationError, AuthenticationFailed):
            return unauthorized_response()
        except StatusFollowError as error:
            return follow_error_response(error)
        return Response(status=status.HTTP_204_NO_CONTENT)


class StatusFollowAcceptView(AuthenticatedAPIView):
    throttle_classes = [StatusUserThrottle]

    def post(self, request, follow_id):
        try:
            authenticated_user = self.get_authenticated_user(request)
            follow = accept_follow_request(user_id=str(authenticated_user.id), follow_id=str(follow_id))
        except (AccountAuthenticationError, AuthenticationFailed):
            return unauthorized_response()
        except StatusFollowError as error:
            return follow_error_response(error)
        return Response({"follow": StatusFollowSerializer(follow).data}, status=status.HTTP_200_OK)


class StatusFollowRejectView(AuthenticatedAPIView):
    throttle_classes = [StatusUserThrottle]

    def post(self, request, follow_id):
        try:
            authenticated_user = self.get_authenticated_user(request)
            follow = reject_follow_request(user_id=str(authenticated_user.id), follow_id=str(follow_id))
        except (AccountAuthenticationError, AuthenticationFailed):
            return unauthorized_response()
        except StatusFollowError as error:
            return follow_error_response(error)
        return Response({"follow": StatusFollowSerializer(follow).data}, status=status.HTTP_200_OK)
