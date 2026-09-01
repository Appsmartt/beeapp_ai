from rest_framework import status
from rest_framework.response import Response

from apps.accounts.exceptions import AccountAuthenticationError
from apps.accounts.views import AuthenticatedAPIView
from apps.statuses.exceptions import (
    StatusFollowAccessError,
    StatusFollowError,
    StatusFollowNotFoundError,
    StatusFollowValidationError,
    StatusOperationError,
)
from apps.statuses.serializers import (
    StatusFollowDiscoverItemSerializer,
    StatusFollowDiscoverQuerySerializer,
    StatusFollowersQuerySerializer,
    StatusFollowCreateSerializer,
    StatusFollowListItemSerializer,
    StatusFollowListQuerySerializer,
    StatusFollowSerializer,
    StatusTextBackgroundSerializer,
)
from apps.statuses.services.status_follow_service import (
    accept_follow_request,
    discover_follow_targets,
    get_follow_for_user,
    list_followers,
    list_following,
    list_received_follow_requests,
    reject_follow_request,
    request_follow,
    unfollow,
)
from apps.statuses.services.status_service import (
    list_active_text_backgrounds,
)


def _unauthorized_response():
    return Response(
        {
            "detail": "Invalid or expired access token.",
        },
        status=status.HTTP_401_UNAUTHORIZED,
    )


def _follow_error_response(error):
    if isinstance(error, StatusFollowNotFoundError):
        return Response(
            {
                "detail": "Follow relationship was not found.",
            },
            status=status.HTTP_404_NOT_FOUND,
        )

    if isinstance(error, StatusFollowAccessError):
        return Response(
            {
                "detail": str(error),
            },
            status=status.HTTP_403_FORBIDDEN,
        )

    if isinstance(error, StatusFollowValidationError):
        return Response(
            {
                "detail": str(error),
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    return Response(
        {
            "detail": str(error),
        },
        status=status.HTTP_400_BAD_REQUEST,
    )


class StatusTextBackgroundsView(AuthenticatedAPIView):
    def get(self, request):
        try:
            self.get_authenticated_user(request)
            backgrounds = list_active_text_backgrounds()
        except AccountAuthenticationError:
            return _unauthorized_response()
        except StatusOperationError:
            return Response(
                {
                    "detail": "Could not retrieve text backgrounds.",
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(
            {
                "backgrounds": StatusTextBackgroundSerializer(
                    backgrounds,
                    many=True,
                ).data,
            },
            status=status.HTTP_200_OK,
        )


class StatusFollowsView(AuthenticatedAPIView):
    def post(self, request):
        serializer = StatusFollowCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            authenticated_user = self.get_authenticated_user(request)
            follow = request_follow(
                user_id=str(authenticated_user.id),
                **serializer.validated_data,
            )
        except AccountAuthenticationError:
            return _unauthorized_response()
        except StatusFollowError as error:
            return _follow_error_response(error)

        return Response(
            {
                "follow": StatusFollowSerializer(follow).data,
            },
            status=(
                status.HTTP_201_CREATED
                if follow["state"] == "pending"
                else status.HTTP_200_OK
            ),
        )


class StatusFollowDiscoverView(AuthenticatedAPIView):
    """
    GET /api/statuses/follows/discover/?q=<texto>&limit=20&cursor=...
    """

    def get(self, request):
        serializer = StatusFollowDiscoverQuerySerializer(
            data=request.query_params,
        )
        serializer.is_valid(raise_exception=True)

        try:
            authenticated_user = self.get_authenticated_user(request)
            result = discover_follow_targets(
                user_id=str(authenticated_user.id),
                query=serializer.validated_data["q"],
                limit=serializer.validated_data["limit"],
                cursor=serializer.validated_data.get("cursor"),
            )
        except AccountAuthenticationError:
            return _unauthorized_response()
        except StatusFollowError as error:
            return _follow_error_response(error)

        return Response(
            {
                "query": result["query"],
                "limit": result["limit"],
                "items": StatusFollowDiscoverItemSerializer(
                    result["items"],
                    many=True,
                ).data,
                "next_cursor": result["next_cursor"],
            },
            status=status.HTTP_200_OK,
        )


class StatusFollowingView(AuthenticatedAPIView):
    """
    GET /api/statuses/follows/following/?limit=20&cursor=...
    """

    def get(self, request):
        serializer = StatusFollowListQuerySerializer(
            data=request.query_params,
        )
        serializer.is_valid(raise_exception=True)

        try:
            authenticated_user = self.get_authenticated_user(request)
            result = list_following(
                user_id=str(authenticated_user.id),
                **serializer.validated_data,
            )
        except AccountAuthenticationError:
            return _unauthorized_response()
        except StatusFollowError as error:
            return _follow_error_response(error)

        return Response(
            {
                "items": StatusFollowListItemSerializer(
                    result["items"],
                    many=True,
                ).data,
                "limit": result["limit"],
                "next_cursor": result["next_cursor"],
            },
            status=status.HTTP_200_OK,
        )


class StatusFollowersView(AuthenticatedAPIView):
    """
    GET /api/statuses/follows/followers/?actor_type=profile
    GET /api/statuses/follows/followers/?actor_type=commercial_profile&commercial_profile_id=<uuid>
    """

    def get(self, request):
        serializer = StatusFollowersQuerySerializer(
            data=request.query_params,
        )
        serializer.is_valid(raise_exception=True)

        try:
            authenticated_user = self.get_authenticated_user(request)
            result = list_followers(
                user_id=str(authenticated_user.id),
                **serializer.validated_data,
            )
        except AccountAuthenticationError:
            return _unauthorized_response()
        except StatusFollowError as error:
            return _follow_error_response(error)

        return Response(
            {
                "items": StatusFollowListItemSerializer(
                    result["items"],
                    many=True,
                ).data,
                "limit": result["limit"],
                "next_cursor": result["next_cursor"],
            },
            status=status.HTTP_200_OK,
        )


class StatusFollowRequestsView(AuthenticatedAPIView):
    """
    GET /api/statuses/follows/requests/?limit=20&cursor=...
    """

    def get(self, request):
        serializer = StatusFollowListQuerySerializer(
            data=request.query_params,
        )
        serializer.is_valid(raise_exception=True)

        try:
            authenticated_user = self.get_authenticated_user(request)
            result = list_received_follow_requests(
                user_id=str(authenticated_user.id),
                **serializer.validated_data,
            )
        except AccountAuthenticationError:
            return _unauthorized_response()
        except StatusFollowError as error:
            return _follow_error_response(error)

        return Response(
            {
                "items": StatusFollowListItemSerializer(
                    result["items"],
                    many=True,
                ).data,
                "limit": result["limit"],
                "next_cursor": result["next_cursor"],
            },
            status=status.HTTP_200_OK,
        )


class StatusFollowDetailView(AuthenticatedAPIView):
    def get(self, request, follow_id):
        try:
            authenticated_user = self.get_authenticated_user(request)
            follow = get_follow_for_user(
                user_id=str(authenticated_user.id),
                follow_id=str(follow_id),
            )
        except AccountAuthenticationError:
            return _unauthorized_response()
        except StatusFollowError as error:
            return _follow_error_response(error)

        return Response(
            {
                "follow": StatusFollowSerializer(follow).data,
            },
            status=status.HTTP_200_OK,
        )

    def delete(self, request, follow_id):
        try:
            authenticated_user = self.get_authenticated_user(request)
            unfollow(
                user_id=str(authenticated_user.id),
                follow_id=str(follow_id),
            )
        except AccountAuthenticationError:
            return _unauthorized_response()
        except StatusFollowError as error:
            return _follow_error_response(error)

        return Response(status=status.HTTP_204_NO_CONTENT)


class StatusFollowAcceptView(AuthenticatedAPIView):
    def post(self, request, follow_id):
        try:
            authenticated_user = self.get_authenticated_user(request)
            follow = accept_follow_request(
                user_id=str(authenticated_user.id),
                follow_id=str(follow_id),
            )
        except AccountAuthenticationError:
            return _unauthorized_response()
        except StatusFollowError as error:
            return _follow_error_response(error)

        return Response(
            {
                "follow": StatusFollowSerializer(follow).data,
            },
            status=status.HTTP_200_OK,
        )


class StatusFollowRejectView(AuthenticatedAPIView):
    def post(self, request, follow_id):
        try:
            authenticated_user = self.get_authenticated_user(request)
            follow = reject_follow_request(
                user_id=str(authenticated_user.id),
                follow_id=str(follow_id),
            )
        except AccountAuthenticationError:
            return _unauthorized_response()
        except StatusFollowError as error:
            return _follow_error_response(error)

        return Response(
            {
                "follow": StatusFollowSerializer(follow).data,
            },
            status=status.HTTP_200_OK,
        )
