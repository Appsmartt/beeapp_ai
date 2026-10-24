from rest_framework import status
from rest_framework.exceptions import AuthenticationFailed
from rest_framework.response import Response

from apps.accounts.exceptions import AccountAuthenticationError
from apps.accounts.views import AuthenticatedAPIView
from apps.statuses.exceptions import StatusOperationError
from apps.statuses.serializers import StatusCreateSerializer, StatusDetailQuerySerializer, StatusFeedAuthorSerializer, StatusFeedQuerySerializer, StatusMineQuerySerializer, StatusStorySerializer, StatusTextBackgroundSerializer
from apps.statuses.services.status_refactor import archive_status_story, create_status_story, get_my_statuses, get_status_story, list_active_text_backgrounds, list_author_status_stories, list_status_feed
from apps.statuses.throttles import StatusPublishThrottle, StatusUserThrottle
from apps.statuses.views_refactor.common import status_error_response, unauthorized_response


class StatusTextBackgroundsView(AuthenticatedAPIView):
    throttle_classes = [StatusUserThrottle]

    def get(self, request):
        try:
            self.get_authenticated_user(request)
            backgrounds = list_active_text_backgrounds()
        except (AccountAuthenticationError, AuthenticationFailed):
            return unauthorized_response()
        except StatusOperationError:
            return Response({"detail": "Could not retrieve text backgrounds."}, status=status.HTTP_400_BAD_REQUEST)
        return Response({"backgrounds": StatusTextBackgroundSerializer(backgrounds, many=True).data}, status=status.HTTP_200_OK)


class StatusFeedView(AuthenticatedAPIView):
    throttle_classes = [StatusUserThrottle]

    def get(self, request):
        serializer = StatusFeedQuerySerializer(data=request.query_params)
        serializer.is_valid(raise_exception=True)
        try:
            authenticated_user = self.get_authenticated_user(request)
            feed = list_status_feed(user_id=str(authenticated_user.id), limit=serializer.validated_data["limit"])
        except (AccountAuthenticationError, AuthenticationFailed):
            return unauthorized_response()
        except Exception as error:
            return status_error_response(error)
        return Response({"items": [{"author": StatusFeedAuthorSerializer(item["author"]).data, "stories": StatusStorySerializer(item["stories"], many=True).data} for item in feed["items"]], "limit": feed["limit"]}, status=status.HTTP_200_OK)


class StatusMineView(AuthenticatedAPIView):
    throttle_classes = [StatusUserThrottle]

    def get(self, request):
        serializer = StatusMineQuerySerializer(data=request.query_params)
        serializer.is_valid(raise_exception=True)
        try:
            authenticated_user = self.get_authenticated_user(request)
            mine = get_my_statuses(user_id=str(authenticated_user.id), include_archived=serializer.validated_data["include_archived"])
        except (AccountAuthenticationError, AuthenticationFailed):
            return unauthorized_response()
        except Exception as error:
            return status_error_response(error)
        active = mine["active"]
        archive = mine.get("archive")
        response_payload = {"active": {"profile": {"actor": active["profile"]["actor"], "stories": StatusStorySerializer(active["profile"]["stories"], many=True).data}, "commercial_profiles": [{"actor": item["actor"], "stories": StatusStorySerializer(item["stories"], many=True).data} for item in active["commercial_profiles"]]}, "archive": None}
        if archive is not None:
            response_payload["archive"] = {"profile": {"actor": archive["profile"]["actor"], "stories": StatusStorySerializer(archive["profile"]["stories"], many=True).data}, "commercial_profiles": [{"actor": item["actor"], "stories": StatusStorySerializer(item["stories"], many=True).data} for item in archive["commercial_profiles"]]}
        return Response(response_payload, status=status.HTTP_200_OK)


class StatusAuthorStoriesView(AuthenticatedAPIView):
    throttle_classes = [StatusUserThrottle]

    def get(self, request, actor_type, actor_id):
        try:
            authenticated_user = self.get_authenticated_user(request)
            result = list_author_status_stories(user_id=str(authenticated_user.id), actor_type=actor_type, actor_id=str(actor_id), scope="active")
        except (AccountAuthenticationError, AuthenticationFailed):
            return unauthorized_response()
        except Exception as error:
            return status_error_response(error)
        return Response({"actor": result["actor"], "stories": StatusStorySerializer(result["stories"], many=True).data, "scope": result["scope"]}, status=status.HTTP_200_OK)


class StatusCollectionView(AuthenticatedAPIView):
    throttle_classes = [StatusPublishThrottle]

    def post(self, request):
        serializer = StatusCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            authenticated_user = self.get_authenticated_user(request)
            duration_seconds = serializer.validated_data.get("duration_seconds")
            story = create_status_story(user_id=str(authenticated_user.id), actor_type=serializer.validated_data["actor_type"], actor_commercial_profile_id=str(serializer.validated_data["actor_commercial_profile_id"]) if serializer.validated_data.get("actor_commercial_profile_id") else None, kind=serializer.validated_data["kind"], caption=serializer.validated_data.get("caption"), text_content=serializer.validated_data.get("text_content"), text_background_id=str(serializer.validated_data["text_background_id"]) if serializer.validated_data.get("text_background_id") else None, editor_metadata=serializer.validated_data["editor_metadata"], uploaded_file=serializer.validated_data.get("file"), duration_seconds=float(duration_seconds) if duration_seconds is not None else None, image_layer_files=serializer.validated_data["image_layer_files"], commercial_offer_link=serializer.validated_data.get("commercial_offer_link"))
        except (AccountAuthenticationError, AuthenticationFailed):
            return unauthorized_response()
        except Exception as error:
            return status_error_response(error)
        return Response({"status": StatusStorySerializer(story).data}, status=status.HTTP_201_CREATED)


class StatusDetailView(AuthenticatedAPIView):
    throttle_classes = [StatusUserThrottle]

    def get(self, request, status_id):
        serializer = StatusDetailQuerySerializer(data=request.query_params)
        serializer.is_valid(raise_exception=True)
        try:
            authenticated_user = self.get_authenticated_user(request)
            story = get_status_story(user_id=str(authenticated_user.id), story_id=str(status_id), include_archived=serializer.validated_data["include_archived"])
        except (AccountAuthenticationError, AuthenticationFailed):
            return unauthorized_response()
        except Exception as error:
            return status_error_response(error)
        return Response({"status": StatusStorySerializer(story).data}, status=status.HTTP_200_OK)

    def delete(self, request, status_id):
        try:
            authenticated_user = self.get_authenticated_user(request)
            story = archive_status_story(user_id=str(authenticated_user.id), story_id=str(status_id))
        except (AccountAuthenticationError, AuthenticationFailed):
            return unauthorized_response()
        except Exception as error:
            return status_error_response(error)
        return Response({"status": StatusStorySerializer(story).data, "archived": True}, status=status.HTTP_200_OK)
