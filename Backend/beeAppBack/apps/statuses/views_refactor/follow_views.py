from rest_framework import status
from rest_framework.exceptions import AuthenticationFailed
from rest_framework.response import Response

from apps.accounts.exceptions import AccountAuthenticationError
from apps.accounts.views import AuthenticatedAPIView
from apps.statuses.exceptions import StatusFollowError
from apps.statuses.serializers import StatusFollowCreateSerializer, StatusFollowDiscoverItemSerializer, StatusFollowDiscoverQuerySerializer, StatusFollowListItemSerializer, StatusFollowListQuerySerializer, StatusFollowSerializer, StatusFollowersQuerySerializer
from apps.statuses.services.status_follow_service import discover_follow_targets, list_followers, list_following, list_received_follow_requests, request_follow
from apps.statuses.throttles import StatusUserThrottle
from apps.statuses.views_refactor.common import follow_error_response, unauthorized_response


class StatusFollowsView(AuthenticatedAPIView):
    throttle_classes = [StatusUserThrottle]

    def post(self, request):
        serializer = StatusFollowCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            authenticated_user, access_token = self.get_authenticated_user_and_access_token(request)
            follow = request_follow(user_id=str(authenticated_user.id), access_token=access_token, **serializer.validated_data)
        except (AccountAuthenticationError, AuthenticationFailed):
            return unauthorized_response()
        except StatusFollowError as error:
            return follow_error_response(error)
        return Response({"follow": StatusFollowSerializer(follow).data}, status=status.HTTP_201_CREATED if follow["state"] == "pending" else status.HTTP_200_OK)


class StatusFollowDiscoverView(AuthenticatedAPIView):
    throttle_classes = [StatusUserThrottle]

    def get(self, request):
        serializer = StatusFollowDiscoverQuerySerializer(data=request.query_params)
        serializer.is_valid(raise_exception=True)
        try:
            authenticated_user, access_token = self.get_authenticated_user_and_access_token(request)
            result = discover_follow_targets(user_id=str(authenticated_user.id), access_token=access_token, query=serializer.validated_data["q"], limit=serializer.validated_data["limit"], cursor=serializer.validated_data.get("cursor"))
        except (AccountAuthenticationError, AuthenticationFailed):
            return unauthorized_response()
        except StatusFollowError as error:
            return follow_error_response(error)
        return Response({"query": result["query"], "limit": result["limit"], "items": StatusFollowDiscoverItemSerializer(result["items"], many=True).data, "next_cursor": result["next_cursor"]}, status=status.HTTP_200_OK)


class StatusFollowingView(AuthenticatedAPIView):
    throttle_classes = [StatusUserThrottle]

    def get(self, request):
        serializer = StatusFollowListQuerySerializer(data=request.query_params)
        serializer.is_valid(raise_exception=True)
        try:
            authenticated_user = self.get_authenticated_user(request)
            result = list_following(user_id=str(authenticated_user.id), **serializer.validated_data)
        except (AccountAuthenticationError, AuthenticationFailed):
            return unauthorized_response()
        except StatusFollowError as error:
            return follow_error_response(error)
        return Response({"items": StatusFollowListItemSerializer(result["items"], many=True).data, "count": result["count"], "limit": result["limit"], "next_cursor": result["next_cursor"]}, status=status.HTTP_200_OK)


class StatusFollowersView(AuthenticatedAPIView):
    throttle_classes = [StatusUserThrottle]

    def get(self, request):
        serializer = StatusFollowersQuerySerializer(data=request.query_params)
        serializer.is_valid(raise_exception=True)
        try:
            authenticated_user = self.get_authenticated_user(request)
            result = list_followers(user_id=str(authenticated_user.id), **serializer.validated_data)
        except (AccountAuthenticationError, AuthenticationFailed):
            return unauthorized_response()
        except StatusFollowError as error:
            return follow_error_response(error)
        return Response({"items": StatusFollowListItemSerializer(result["items"], many=True).data, "count": result["count"], "limit": result["limit"], "next_cursor": result["next_cursor"]}, status=status.HTTP_200_OK)


class StatusFollowRequestsView(AuthenticatedAPIView):
    throttle_classes = [StatusUserThrottle]

    def get(self, request):
        serializer = StatusFollowListQuerySerializer(data=request.query_params)
        serializer.is_valid(raise_exception=True)
        try:
            authenticated_user = self.get_authenticated_user(request)
            follow_request_query = {"limit": serializer.validated_data["limit"], "cursor": serializer.validated_data.get("cursor")}
            result = list_received_follow_requests(user_id=str(authenticated_user.id), **follow_request_query)
        except (AccountAuthenticationError, AuthenticationFailed):
            return unauthorized_response()
        except StatusFollowError as error:
            return follow_error_response(error)
        return Response({"items": StatusFollowListItemSerializer(result["items"], many=True).data, "count": result["count"], "limit": result["limit"], "next_cursor": result["next_cursor"]}, status=status.HTTP_200_OK)
