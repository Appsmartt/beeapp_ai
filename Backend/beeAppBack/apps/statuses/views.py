from rest_framework import status
from rest_framework.exceptions import AuthenticationFailed
from rest_framework.response import Response

from apps.accounts.exceptions import AccountAuthenticationError
from apps.accounts.views import AuthenticatedAPIView
from apps.statuses.exceptions import (
    StatusAccessError,
    StatusArchiveError,
    StatusFollowAccessError,
    StatusFollowError,
    StatusFollowNotFoundError,
    StatusFollowValidationError,
    StatusMediaError,
    StatusNotFoundError,
    StatusOperationError,
    StatusReplyError,
    StatusValidationError,
    StatusViewError,
    StatusViewerAccessError,
)
from apps.statuses.serializers import (
    StatusCreateSerializer,
    StatusDetailQuerySerializer,
    StatusFeedAuthorSerializer,
    StatusFeedQuerySerializer,
    StatusFollowCreateSerializer,
    StatusFollowDiscoverItemSerializer,
    StatusFollowDiscoverQuerySerializer,
    StatusFollowListItemSerializer,
    StatusFollowListQuerySerializer,
    StatusFollowSerializer,
    StatusFollowersQuerySerializer,
    StatusMineQuerySerializer,
    StatusReplySerializer,
    StatusStorySerializer,
    StatusTextBackgroundSerializer,
    StatusViewerSerializer,
)
from apps.statuses.services.status_chat_service import (
    send_status_story_reply,
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
    archive_status_story,
    create_status_story,
    get_my_statuses,
    get_status_story,
    list_active_text_backgrounds,
    list_author_status_stories,
    list_status_feed,
    list_status_story_viewers,
    register_status_story_view,
)
from apps.statuses.throttles import (
    StatusPublishThrottle,
    StatusReplyThrottle,
    StatusUserThrottle,
    StatusViewThrottle,
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


def _status_error_response(error):
    if isinstance(error, StatusNotFoundError):
        return Response(
            {
                "detail": str(error),
            },
            status=status.HTTP_404_NOT_FOUND,
        )

    if isinstance(
        error,
        (
            StatusAccessError,
            StatusViewerAccessError,
        ),
    ):
        return Response(
            {
                "detail": str(error),
            },
            status=status.HTTP_403_FORBIDDEN,
        )

    if isinstance(error, StatusArchiveError):
        return Response(
            {
                "detail": str(error),
            },
            status=status.HTTP_403_FORBIDDEN,
        )

    if isinstance(
        error,
        (
            StatusValidationError,
            StatusMediaError,
            StatusViewError,
            StatusReplyError,
            StatusOperationError,
        ),
    ):
        return Response(
            {
                "detail": str(error),
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    return Response(
        {
            "detail": "Could not complete status operation.",
        },
        status=status.HTTP_400_BAD_REQUEST,
    )


def _get_required_bearer_token(request) -> str:
    authorization_header = str(
        request.headers.get("Authorization") or ""
    ).strip()

    scheme, separator, token = authorization_header.partition(
        " "
    )

    if scheme.lower() != "bearer" or not separator or not token:
        raise AccountAuthenticationError(
            "A Bearer access token is required."
        )

    return token.strip()


class StatusTextBackgroundsView(AuthenticatedAPIView):
    throttle_classes = [StatusUserThrottle]

    def get(self, request):
        try:
            self.get_authenticated_user(request)
            backgrounds = list_active_text_backgrounds()
        except (
            AccountAuthenticationError,
            AuthenticationFailed,
        ):
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


class StatusFeedView(AuthenticatedAPIView):
    throttle_classes = [StatusUserThrottle]

    def get(self, request):
        serializer = StatusFeedQuerySerializer(
            data=request.query_params,
        )
        serializer.is_valid(raise_exception=True)

        try:
            authenticated_user = self.get_authenticated_user(request)
            feed = list_status_feed(
                user_id=str(authenticated_user.id),
                limit=serializer.validated_data["limit"],
            )
        except (
            AccountAuthenticationError,
            AuthenticationFailed,
        ):
            return _unauthorized_response()
        except Exception as error:
            return _status_error_response(error)

        return Response(
            {
                "authors": StatusFeedAuthorSerializer(
                    feed["authors"],
                    many=True,
                ).data,
                "limit": feed["limit"],
            },
            status=status.HTTP_200_OK,
        )


class StatusMineView(AuthenticatedAPIView):
    throttle_classes = [StatusUserThrottle]

    def get(self, request):
        serializer = StatusMineQuerySerializer(
            data=request.query_params,
        )
        serializer.is_valid(raise_exception=True)

        try:
            authenticated_user = self.get_authenticated_user(request)
            mine = get_my_statuses(
                user_id=str(authenticated_user.id),
                include_archived=serializer.validated_data[
                    "include_archived"
                ],
            )
        except (
            AccountAuthenticationError,
            AuthenticationFailed,
        ):
            return _unauthorized_response()
        except Exception as error:
            return _status_error_response(error)

        active = mine["active"]
        archive = mine.get("archive")

        response_payload = {
            "active": {
                "profile": {
                    "actor": active["profile"]["actor"],
                    "stories": StatusStorySerializer(
                        active["profile"]["stories"],
                        many=True,
                    ).data,
                },
                "commercial_profiles": [
                    {
                        "actor": item["actor"],
                        "stories": StatusStorySerializer(
                            item["stories"],
                            many=True,
                        ).data,
                    }
                    for item in active["commercial_profiles"]
                ],
            },
            "archive": None,
        }

        if archive is not None:
            response_payload["archive"] = {
                "profile": {
                    "actor": archive["profile"]["actor"],
                    "stories": StatusStorySerializer(
                        archive["profile"]["stories"],
                        many=True,
                    ).data,
                },
                "commercial_profiles": [
                    {
                        "actor": item["actor"],
                        "stories": StatusStorySerializer(
                            item["stories"],
                            many=True,
                        ).data,
                    }
                    for item in archive["commercial_profiles"]
                ],
            }

        return Response(
            response_payload,
            status=status.HTTP_200_OK,
        )


class StatusAuthorStoriesView(AuthenticatedAPIView):
    throttle_classes = [StatusUserThrottle]

    def get(self, request, actor_type, actor_id):
        try:
            authenticated_user = self.get_authenticated_user(request)

            result = list_author_status_stories(
                user_id=str(authenticated_user.id),
                actor_type=actor_type,
                actor_id=str(actor_id),
                scope="active",
            )
        except (
            AccountAuthenticationError,
            AuthenticationFailed,
        ):
            return _unauthorized_response()
        except Exception as error:
            return _status_error_response(error)

        return Response(
            {
                "actor": result["actor"],
                "stories": StatusStorySerializer(
                    result["stories"],
                    many=True,
                ).data,
                "scope": result["scope"],
            },
            status=status.HTTP_200_OK,
        )


class StatusCollectionView(AuthenticatedAPIView):
    """
    POST /api/statuses/

    Request:
    - application/json for text stories;
    - multipart/form-data for image, gif, and video stories.
    """

    throttle_classes = [StatusPublishThrottle]

    def post(self, request):
        serializer = StatusCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            authenticated_user = self.get_authenticated_user(request)

            duration_seconds = serializer.validated_data.get(
                "duration_seconds"
            )

            story = create_status_story(
                user_id=str(authenticated_user.id),
                actor_type=serializer.validated_data["actor_type"],
                actor_commercial_profile_id=(
                    str(
                        serializer.validated_data[
                            "actor_commercial_profile_id"
                        ]
                    )
                    if serializer.validated_data.get(
                        "actor_commercial_profile_id"
                    )
                    else None
                ),
                kind=serializer.validated_data["kind"],
                caption=serializer.validated_data.get("caption"),
                text_content=serializer.validated_data.get(
                    "text_content"
                ),
                text_background_id=(
                    str(
                        serializer.validated_data[
                            "text_background_id"
                        ]
                    )
                    if serializer.validated_data.get(
                        "text_background_id"
                    )
                    else None
                ),
                editor_metadata=serializer.validated_data[
                    "editor_metadata"
                ],
                uploaded_file=serializer.validated_data.get("file"),
                duration_seconds=(
                    float(duration_seconds)
                    if duration_seconds is not None
                    else None
                ),
            )
        except (
            AccountAuthenticationError,
            AuthenticationFailed,
        ):
            return _unauthorized_response()
        except Exception as error:
            return _status_error_response(error)

        return Response(
            {
                "status": StatusStorySerializer(story).data,
            },
            status=status.HTTP_201_CREATED,
        )


class StatusDetailView(AuthenticatedAPIView):
    throttle_classes = [StatusUserThrottle]

    def get(self, request, status_id):
        serializer = StatusDetailQuerySerializer(
            data=request.query_params,
        )
        serializer.is_valid(raise_exception=True)

        try:
            authenticated_user = self.get_authenticated_user(request)

            story = get_status_story(
                user_id=str(authenticated_user.id),
                story_id=str(status_id),
                include_archived=serializer.validated_data[
                    "include_archived"
                ],
            )
        except (
            AccountAuthenticationError,
            AuthenticationFailed,
        ):
            return _unauthorized_response()
        except Exception as error:
            return _status_error_response(error)

        return Response(
            {
                "status": StatusStorySerializer(story).data,
            },
            status=status.HTTP_200_OK,
        )

    def delete(self, request, status_id):
        try:
            authenticated_user = self.get_authenticated_user(request)

            story = archive_status_story(
                user_id=str(authenticated_user.id),
                story_id=str(status_id),
            )
        except (
            AccountAuthenticationError,
            AuthenticationFailed,
        ):
            return _unauthorized_response()
        except Exception as error:
            return _status_error_response(error)

        return Response(
            {
                "status": StatusStorySerializer(story).data,
                "archived": True,
            },
            status=status.HTTP_200_OK,
        )


class StatusViewsView(AuthenticatedAPIView):
    throttle_classes = [StatusViewThrottle]

    def post(self, request, status_id):
        try:
            authenticated_user = self.get_authenticated_user(request)

            result = register_status_story_view(
                user_id=str(authenticated_user.id),
                story_id=str(status_id),
            )
        except (
            AccountAuthenticationError,
            AuthenticationFailed,
        ):
            return _unauthorized_response()
        except Exception as error:
            return _status_error_response(error)

        return Response(
            {
                "view": result,
            },
            status=status.HTTP_200_OK,
        )


class StatusViewersView(AuthenticatedAPIView):
    throttle_classes = [StatusUserThrottle]

    def get(self, request, status_id):
        try:
            authenticated_user = self.get_authenticated_user(request)

            result = list_status_story_viewers(
                user_id=str(authenticated_user.id),
                story_id=str(status_id),
            )
        except (
            AccountAuthenticationError,
            AuthenticationFailed,
        ):
            return _unauthorized_response()
        except Exception as error:
            return _status_error_response(error)

        return Response(
            {
                "story_id": result["story_id"],
                "count": result["count"],
                "viewers": StatusViewerSerializer(
                    result["viewers"],
                    many=True,
                ).data,
            },
            status=status.HTTP_200_OK,
        )


class StatusRepliesView(AuthenticatedAPIView):
    throttle_classes = [StatusReplyThrottle]

    def post(self, request, status_id):
        serializer = StatusReplySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            access_token = _get_required_bearer_token(request)
            authenticated_user = self.get_authenticated_user(request)

            result = send_status_story_reply(
                user_id=str(authenticated_user.id),
                access_token=access_token,
                story_id=str(status_id),
                sender_identity_id=str(
                    serializer.validated_data[
                        "sender_identity_id"
                    ]
                ),
                body=serializer.validated_data["body"],
            )
        except (
            AccountAuthenticationError,
            AuthenticationFailed,
        ):
            return _unauthorized_response()
        except Exception as error:
            return _status_error_response(error)

        return Response(
            result,
            status=status.HTTP_201_CREATED,
        )


class StatusFollowsView(AuthenticatedAPIView):
    throttle_classes = [StatusUserThrottle]

    def post(self, request):
        serializer = StatusFollowCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            authenticated_user = self.get_authenticated_user(request)
            follow = request_follow(
                user_id=str(authenticated_user.id),
                **serializer.validated_data,
            )
        except (
            AccountAuthenticationError,
            AuthenticationFailed,
        ):
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
    throttle_classes = [StatusUserThrottle]

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
        except (
            AccountAuthenticationError,
            AuthenticationFailed,
        ):
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
    throttle_classes = [StatusUserThrottle]

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
        except (
            AccountAuthenticationError,
            AuthenticationFailed,
        ):
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
    throttle_classes = [StatusUserThrottle]

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
        except (
            AccountAuthenticationError,
            AuthenticationFailed,
        ):
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
    throttle_classes = [StatusUserThrottle]

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
        except (
            AccountAuthenticationError,
            AuthenticationFailed,
        ):
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
    throttle_classes = [StatusUserThrottle]

    def get(self, request, follow_id):
        try:
            authenticated_user = self.get_authenticated_user(request)
            follow = get_follow_for_user(
                user_id=str(authenticated_user.id),
                follow_id=str(follow_id),
            )
        except (
            AccountAuthenticationError,
            AuthenticationFailed,
        ):
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
        except (
            AccountAuthenticationError,
            AuthenticationFailed,
        ):
            return _unauthorized_response()
        except StatusFollowError as error:
            return _follow_error_response(error)

        return Response(status=status.HTTP_204_NO_CONTENT)


class StatusFollowAcceptView(AuthenticatedAPIView):
    throttle_classes = [StatusUserThrottle]

    def post(self, request, follow_id):
        try:
            authenticated_user = self.get_authenticated_user(request)
            follow = accept_follow_request(
                user_id=str(authenticated_user.id),
                follow_id=str(follow_id),
            )
        except (
            AccountAuthenticationError,
            AuthenticationFailed,
        ):
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
    throttle_classes = [StatusUserThrottle]

    def post(self, request, follow_id):
        try:
            authenticated_user = self.get_authenticated_user(request)
            follow = reject_follow_request(
                user_id=str(authenticated_user.id),
                follow_id=str(follow_id),
            )
        except (
            AccountAuthenticationError,
            AuthenticationFailed,
        ):
            return _unauthorized_response()
        except StatusFollowError as error:
            return _follow_error_response(error)

        return Response(
            {
                "follow": StatusFollowSerializer(follow).data,
            },
            status=status.HTTP_200_OK,
        )
