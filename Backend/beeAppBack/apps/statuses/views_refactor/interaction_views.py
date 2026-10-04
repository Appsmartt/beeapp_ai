from rest_framework import status
from rest_framework.exceptions import AuthenticationFailed
from rest_framework.response import Response

from apps.accounts.exceptions import AccountAuthenticationError
from apps.accounts.views import AuthenticatedAPIView
from apps.statuses.serializers import StatusReplySerializer, StatusViewerSerializer
from apps.statuses.services.status_chat_service import send_status_story_reply
from apps.statuses.services.status_refactor import list_status_story_viewers, register_status_story_view
from apps.statuses.throttles import StatusReplyThrottle, StatusUserThrottle, StatusViewThrottle
from apps.statuses.views_refactor.common import get_required_bearer_token, status_error_response, unauthorized_response


class StatusViewsView(AuthenticatedAPIView):
    throttle_classes = [StatusViewThrottle]

    def post(self, request, status_id):
        try:
            authenticated_user = self.get_authenticated_user(request)
            result = register_status_story_view(user_id=str(authenticated_user.id), story_id=str(status_id))
        except (AccountAuthenticationError, AuthenticationFailed):
            return unauthorized_response()
        except Exception as error:
            return status_error_response(error)
        return Response({"view": result}, status=status.HTTP_200_OK)


class StatusViewersView(AuthenticatedAPIView):
    throttle_classes = [StatusUserThrottle]

    def get(self, request, status_id):
        try:
            authenticated_user = self.get_authenticated_user(request)
            result = list_status_story_viewers(user_id=str(authenticated_user.id), story_id=str(status_id))
        except (AccountAuthenticationError, AuthenticationFailed):
            return unauthorized_response()
        except Exception as error:
            return status_error_response(error)
        return Response({"story_id": result["story_id"], "count": result["count"], "viewers": StatusViewerSerializer(result["viewers"], many=True).data}, status=status.HTTP_200_OK)


class StatusRepliesView(AuthenticatedAPIView):
    throttle_classes = [StatusReplyThrottle]

    def post(self, request, status_id):
        serializer = StatusReplySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            access_token = get_required_bearer_token(request)
            authenticated_user = self.get_authenticated_user(request)
            result = send_status_story_reply(user_id=str(authenticated_user.id), access_token=access_token, story_id=str(status_id), sender_identity_id=str(serializer.validated_data["sender_identity_id"]), body=serializer.validated_data["body"])
        except (AccountAuthenticationError, AuthenticationFailed):
            return unauthorized_response()
        except Exception as error:
            return status_error_response(error)
        return Response(result, status=status.HTTP_201_CREATED)
