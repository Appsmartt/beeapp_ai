from rest_framework import serializers, status
from rest_framework.response import Response

from apps.accounts.exceptions import AccountAuthenticationError
from apps.accounts.views import AuthenticatedAPIView
from apps.chat.exceptions import (
    ChatConversationAccessError,
    ChatConversationNotFoundError,
    ChatIdentityNotFoundError,
)
from apps.chat.services.chat_category_service import (
    create_chat_category,
    delete_chat_category,
    list_chat_categories,
    list_chat_category_assignments,
    set_chat_categories,
)
from apps.chat.views import _get_access_token


class CategoryIdentityQuerySerializer(serializers.Serializer):
    identity_id = serializers.UUIDField()


class CreateChatCategorySerializer(CategoryIdentityQuerySerializer):
    name = serializers.CharField(max_length=40, trim_whitespace=True)
    icon = serializers.ChoiceField(choices=(
        "User", "Users", "Briefcase", "Heart", "Home", "Star",
        "GraduationCap", "Coffee", "Gamepad2", "ShoppingBag",
        "BookOpen", "Music2", "Plane", "Palette", "Leaf",
    ))
    color = serializers.ChoiceField(choices=(
        "#EBF5FF", "#FCE7F3", "#ECFDF5", "#FEF3C7", "#EEF2FF",
        "#FDE8E8", "#E0F7FA", "#F3E8FF", "#FFF1E6", "#E9F7EF",
        "#FCEFEF", "#E7F0FF", "#F5F0E6", "#E8F5E9", "#F1EFFF",
        "#FFD6CC", "#FFE4C7", "#FFE8A8", "#FFF3B0", "#E4F4B2",
        "#BFEEDC", "#BFEDEB", "#CBE8FF", "#CDDFFF", "#DAD7FF",
        "#EAD7FF", "#F3D5F5", "#FFD5E8", "#FFD6D9", "#DFE7EE",
    ))


class AssignmentQuerySerializer(CategoryIdentityQuerySerializer):
    conversation_ids = serializers.ListField(
        child=serializers.UUIDField(),
        allow_empty=True,
        max_length=100,
    )


class SaveChatCategoriesSerializer(CategoryIdentityQuerySerializer):
    category_ids = serializers.ListField(
        child=serializers.UUIDField(),
        allow_empty=True,
        max_length=20,
    )


def _error_response(error):
    if isinstance(error, AccountAuthenticationError):
        return Response({"detail": "Invalid or expired access token."},
                        status=status.HTTP_401_UNAUTHORIZED)
    if isinstance(error, ChatConversationNotFoundError):
        return Response({"detail": str(error)}, status=status.HTTP_404_NOT_FOUND)
    if isinstance(error, (ChatIdentityNotFoundError, ChatConversationAccessError)):
        return Response({"detail": "Chat identity or category is inaccessible."},
                        status=status.HTTP_403_FORBIDDEN)
    if isinstance(error, ValueError):
        return Response({"detail": str(error)}, status=status.HTTP_400_BAD_REQUEST)
    return Response({"detail": "Could not update chat categories."},
                    status=status.HTTP_400_BAD_REQUEST)


class ChatCategoriesView(AuthenticatedAPIView):
    def get(self, request):
        query = CategoryIdentityQuerySerializer(data=request.query_params)
        query.is_valid(raise_exception=True)
        try:
            user = self.get_authenticated_user(request)
            categories = list_chat_categories(
                user_id=str(user.id),
                access_token=_get_access_token(request),
                identity_id=str(query.validated_data["identity_id"]),
            )
        except Exception as error:
            return _error_response(error)
        return Response({"categories": categories})

    def post(self, request):
        payload = CreateChatCategorySerializer(data=request.data)
        payload.is_valid(raise_exception=True)
        try:
            user = self.get_authenticated_user(request)
            category = create_chat_category(
                user_id=str(user.id),
                access_token=_get_access_token(request),
                identity_id=str(payload.validated_data["identity_id"]),
                name=payload.validated_data["name"],
                icon=payload.validated_data["icon"],
                color=payload.validated_data["color"],
            )
        except Exception as error:
            return _error_response(error)
        return Response({"category": category}, status=status.HTTP_201_CREATED)


class ChatCategoryDetailView(AuthenticatedAPIView):
    def delete(self, request, category_id):
        query = CategoryIdentityQuerySerializer(data=request.query_params)
        query.is_valid(raise_exception=True)
        try:
            user = self.get_authenticated_user(request)
            delete_chat_category(
                user_id=str(user.id),
                access_token=_get_access_token(request),
                identity_id=str(query.validated_data["identity_id"]),
                category_id=str(category_id),
            )
        except Exception as error:
            return _error_response(error)
        return Response(status=status.HTTP_204_NO_CONTENT)


class ChatCategoryAssignmentsView(AuthenticatedAPIView):
    def get(self, request):
        query = AssignmentQuerySerializer(data={
            "identity_id": request.query_params.get("identity_id"),
            "conversation_ids": request.query_params.getlist("conversation_id"),
        })
        query.is_valid(raise_exception=True)
        try:
            user = self.get_authenticated_user(request)
            assignments = list_chat_category_assignments(
                user_id=str(user.id),
                access_token=_get_access_token(request),
                identity_id=str(query.validated_data["identity_id"]),
                conversation_ids=[
                    str(item) for item in query.validated_data["conversation_ids"]
                ],
            )
        except Exception as error:
            return _error_response(error)
        return Response({"assignments": assignments})


class ChatConversationCategoriesView(AuthenticatedAPIView):
    def put(self, request, conversation_id):
        payload = SaveChatCategoriesSerializer(data=request.data)
        payload.is_valid(raise_exception=True)
        try:
            user = self.get_authenticated_user(request)
            category_ids = set_chat_categories(
                user_id=str(user.id),
                access_token=_get_access_token(request),
                identity_id=str(payload.validated_data["identity_id"]),
                conversation_id=str(conversation_id),
                category_ids=[
                    str(item) for item in payload.validated_data["category_ids"]
                ],
            )
        except Exception as error:
            return _error_response(error)
        return Response({"category_ids": category_ids})
