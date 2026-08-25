import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Keyboard,
    KeyboardAvoidingView,
    Platform,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    TouchableWithoutFeedback,
    View,
    } from 'react-native';
import {
    useLocalSearchParams,
    useRouter,
    } from 'expo-router';
import {
    Eye,
    EyeOff,
    LockKeyhole,
    } from 'lucide-react-native';
import { colors } from '@beeapp/design-system';
import { confirmPasswordReset } from '@beeapp/api-client';

import BuddyLogo from '../../src/components/BuddyLogo';
import ScreenSafeArea from '../../src/components/layout/ScreenSafeArea';
import { clearAuthSession } from '../../src/services/authSession';


const MIN_PASSWORD_LENGTH = 8;


function getParam(value: string | string[] | undefined): string {
    return typeof value === 'string' ? value : '';
}


export default function ResetPasswordScreen() {
    const router = useRouter();
    const params = useLocalSearchParams();

    const resetToken = getParam(params.resetToken);

    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isNewPasswordVisible, setIsNewPasswordVisible] =
        useState(false);
    const [isConfirmPasswordVisible, setIsConfirmPasswordVisible] =
        useState(false);
    const [error, setError] = useState('');
    const [formMessage, setFormMessage] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (!resetToken) {
        router.replace('/(auth)/forgot-password');
        }
    }, [resetToken, router]);

    const handleUpdatePassword = async () => {
        if (newPassword.length < MIN_PASSWORD_LENGTH) {
        setError(
            'La contraseña debe tener al menos ocho caracteres.',
        );
        return;
        }

        if (newPassword !== confirmPassword) {
        setError('Las contraseñas no coinciden.');
        return;
        }

        try {
        setIsSubmitting(true);
        setError('');
        setFormMessage('');

        await confirmPasswordReset({
            reset_token: resetToken,
            new_password: newPassword,
            confirm_password: confirmPassword,
        });

        await clearAuthSession();

        router.replace('/(auth)/login');
        } catch (requestError) {
        setFormMessage(
            requestError instanceof Error
            ? requestError.message
            : (
                'No fue posible actualizar la contraseña. '
                + 'Solicita un nuevo código e inténtalo nuevamente.'
                ),
        );
        } finally {
        setIsSubmitting(false);
        }
    };

    return (
        <ScreenSafeArea style={styles.safeArea}>
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.container}
        >
            <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.content}>
                <View style={styles.logoContainer}>
                <BuddyLogo
                    size={76}
                    showText={false}
                    autoStopAfter={2500}
                />
                </View>

                <View style={styles.header}>
                <View style={styles.iconContainer}>
                    <LockKeyhole
                    size={20}
                    color={colors.brand.primary}
                    />
                </View>

                <Text style={styles.title}>
                    Crea una contraseña nueva
                </Text>

                <Text style={styles.subtitle}>
                    Usa una contraseña segura que no hayas utilizado antes.
                </Text>
                </View>

                <View style={styles.card}>
                <Text style={styles.label}>
                    Nueva contraseña
                </Text>

                <View style={styles.inputContainer}>
                    <LockKeyhole
                    size={18}
                    color={colors.neutral.gray500}
                    />

                    <TextInput
                    style={styles.input}
                    placeholder="Mínimo 8 caracteres"
                    placeholderTextColor={colors.neutral.gray500}
                    autoCapitalize="none"
                    autoComplete="new-password"
                    secureTextEntry={!isNewPasswordVisible}
                    editable={!isSubmitting}
                    value={newPassword}
                    onChangeText={(value) => {
                        setNewPassword(value);
                        setError('');
                        setFormMessage('');
                    }}
                    />

                    <TouchableOpacity
                    style={styles.visibilityButton}
                    activeOpacity={0.7}
                    disabled={isSubmitting}
                    onPress={() => {
                        setIsNewPasswordVisible(
                        (currentValue) => !currentValue,
                        );
                    }}
                    >
                    {isNewPasswordVisible ? (
                        <EyeOff
                        size={18}
                        color={colors.neutral.gray500}
                        />
                    ) : (
                        <Eye
                        size={18}
                        color={colors.neutral.gray500}
                        />
                    )}
                    </TouchableOpacity>
                </View>

                <Text style={styles.labelSecond}>
                    Confirma tu contraseña
                </Text>

                <View
                    style={[
                    styles.inputContainer,
                    error ? styles.inputError : undefined,
                    ]}
                >
                    <LockKeyhole
                    size={18}
                    color={colors.neutral.gray500}
                    />

                    <TextInput
                    style={styles.input}
                    placeholder="Repite tu contraseña"
                    placeholderTextColor={colors.neutral.gray500}
                    autoCapitalize="none"
                    autoComplete="new-password"
                    secureTextEntry={!isConfirmPasswordVisible}
                    editable={!isSubmitting}
                    value={confirmPassword}
                    onChangeText={(value) => {
                        setConfirmPassword(value);
                        setError('');
                        setFormMessage('');
                    }}
                    />

                    <TouchableOpacity
                    style={styles.visibilityButton}
                    activeOpacity={0.7}
                    disabled={isSubmitting}
                    onPress={() => {
                        setIsConfirmPasswordVisible(
                        (currentValue) => !currentValue,
                        );
                    }}
                    >
                    {isConfirmPasswordVisible ? (
                        <EyeOff
                        size={18}
                        color={colors.neutral.gray500}
                        />
                    ) : (
                        <Eye
                        size={18}
                        color={colors.neutral.gray500}
                        />
                    )}
                    </TouchableOpacity>
                </View>

                {error ? (
                    <Text style={styles.errorText}>{error}</Text>
                ) : (
                    <Text style={styles.helperText}>
                    Después de cambiarla, deberás iniciar sesión nuevamente.
                    </Text>
                )}

                <TouchableOpacity
                    style={[
                    styles.primaryButton,
                    isSubmitting
                        ? styles.primaryButtonDisabled
                        : undefined,
                    ]}
                    activeOpacity={0.8}
                    disabled={isSubmitting}
                    onPress={handleUpdatePassword}
                >
                    {isSubmitting ? (
                    <ActivityIndicator color={colors.neutral.white} />
                    ) : (
                    <Text style={styles.primaryButtonText}>
                        Actualizar contraseña
                    </Text>
                    )}
                </TouchableOpacity>

                {formMessage ? (
                    <View style={styles.messageBox}>
                    <Text style={styles.messageText}>
                        {formMessage}
                    </Text>
                    </View>
                ) : null}
                </View>
            </View>
            </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
        </ScreenSafeArea>
    );
}


const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: colors.neutral.gray50,
    },
    container: {
        flex: 1,
    },
    content: {
        flex: 1,
        justifyContent: 'center',
        paddingHorizontal: 24,
        paddingVertical: 16,
    },
    logoContainer: {
        alignItems: 'center',
        marginBottom: 16,
    },
    header: {
        alignItems: 'center',
        marginBottom: 24,
    },
    iconContainer: {
        alignItems: 'center',
        backgroundColor: '#F0EAFF',
        borderRadius: 14,
        height: 46,
        justifyContent: 'center',
        marginBottom: 12,
        width: 46,
    },
    title: {
        color: colors.neutral.text,
        fontSize: 25,
        fontWeight: '700',
        marginBottom: 8,
        textAlign: 'center',
    },
    subtitle: {
        color: colors.neutral.gray600,
        fontSize: 14,
        lineHeight: 20,
        maxWidth: 320,
        textAlign: 'center',
    },
    card: {
        backgroundColor: colors.neutral.white,
        borderColor: colors.neutral.gray200,
        borderRadius: 18,
        borderWidth: 1,
        elevation: 2,
        padding: 16,
        shadowColor: colors.brand.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 12,
    },
    label: {
        color: colors.neutral.gray700,
        fontSize: 12,
        fontWeight: '600',
        marginBottom: 8,
    },
    labelSecond: {
        color: colors.neutral.gray700,
        fontSize: 12,
        fontWeight: '600',
        marginBottom: 8,
        marginTop: 16,
    },
    inputContainer: {
        alignItems: 'center',
        backgroundColor: colors.neutral.white,
        borderColor: colors.neutral.gray200,
        borderRadius: 12,
        borderWidth: 1,
        flexDirection: 'row',
        height: 52,
        paddingHorizontal: 14,
    },
    inputError: {
        borderColor: colors.semantic.error,
    },
    input: {
        color: colors.neutral.text,
        flex: 1,
        fontSize: 14,
        marginLeft: 10,
        paddingVertical: 0,
    },
    visibilityButton: {
        padding: 4,
    },
    helperText: {
        color: colors.neutral.gray500,
        fontSize: 11,
        lineHeight: 16,
        marginTop: 8,
    },
    errorText: {
        color: colors.semantic.error,
        fontSize: 11,
        lineHeight: 16,
        marginTop: 8,
    },
    primaryButton: {
        alignItems: 'center',
        backgroundColor: colors.brand.primary,
        borderRadius: 13,
        elevation: 4,
        height: 52,
        justifyContent: 'center',
        marginTop: 20,
        shadowColor: colors.brand.primary,
        shadowOffset: { width: 0, height: 5 },
        shadowOpacity: 0.22,
        shadowRadius: 9,
    },
    primaryButtonDisabled: {
        opacity: 0.7,
    },
    primaryButtonText: {
        color: colors.neutral.white,
        fontSize: 15,
        fontWeight: '700',
    },
    messageBox: {
        backgroundColor: '#FEF2F2',
        borderColor: '#FECACA',
        borderRadius: 10,
        borderWidth: 1,
        marginTop: 14,
        padding: 11,
    },
    messageText: {
        color: colors.semantic.error,
        fontSize: 12,
        lineHeight: 17,
        textAlign: 'center',
    },
});