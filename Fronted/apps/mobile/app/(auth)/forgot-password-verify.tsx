import {
    useEffect,
    useRef,
    useState,
    } from 'react';
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
    ChevronLeft,
    MessageSquare,
    } from 'lucide-react-native';
import { colors } from '@beeapp/design-system';
import {
    requestPasswordReset,
    verifyPasswordReset,
    } from '@beeapp/api-client';

import AnimatedLogo from '../../src/components/AnimatedLogo';
import ScreenSafeArea from '../../src/components/layout/ScreenSafeArea';


function getParam(value: string | string[] | undefined): string {
    return typeof value === 'string' ? value : '';
}


export default function ForgotPasswordVerifyScreen() {
    const router = useRouter();
    const params = useLocalSearchParams();

    const phone = getParam(params.phone);

    const [code, setCode] = useState('');
    const [error, setError] = useState('');
    const [formMessage, setFormMessage] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isResending, setIsResending] = useState(false);

    const inputRef = useRef<TextInput>(null);

    useEffect(() => {
        if (!phone) {
        router.replace('/(auth)/forgot-password');
        return;
        }

        inputRef.current?.focus();
    }, [phone, router]);

    const handleCodeChange = (value: string) => {
        const normalizedCode = value.replace(/\D/g, '').slice(0, 6);

        setCode(normalizedCode);
        setError('');
        setFormMessage('');
    };

    const handleVerify = async () => {
        if (code.length !== 6) {
        setError('Ingresa el código completo de seis dígitos.');
        return;
        }

        try {
        setIsSubmitting(true);
        setError('');
        setFormMessage('');

        const response = await verifyPasswordReset({
            phone,
            code,
        });

        router.replace({
            pathname: '/(auth)/reset-password',
            params: {
            resetToken: response.reset_token,
            },
        });
        } catch (verificationError) {
        setFormMessage(
            verificationError instanceof Error
            ? verificationError.message
            : 'El código no es válido o ha expirado.',
        );
        } finally {
        setIsSubmitting(false);
        }
    };

    const handleResend = async () => {
        try {
        setIsResending(true);
        setError('');
        setFormMessage('');

        await requestPasswordReset({
            phone,
        });

        setFormMessage(
            'Si el número está registrado, enviamos un nuevo código.',
        );
        } catch (requestError) {
        setFormMessage(
            requestError instanceof Error
            ? requestError.message
            : 'No fue posible reenviar el código.',
        );
        } finally {
        setIsResending(false);
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
                <TouchableOpacity
                style={styles.backButton}
                activeOpacity={0.7}
                disabled={isSubmitting || isResending}
                onPress={() => router.back()}
                >
                <ChevronLeft
                    size={20}
                    color={colors.neutral.gray700}
                />

                <Text style={styles.backButtonText}>Volver</Text>
                </TouchableOpacity>

                <View style={styles.logoContainer}>
                <AnimatedLogo
                    size={76}
                    showText={false}
                    autoStopAfter={2500}
                />
                </View>

                <View style={styles.header}>
                <View style={styles.iconContainer}>
                    <MessageSquare
                    size={20}
                    color={colors.brand.primary}
                    />
                </View>

                <Text style={styles.title}>
                    Verifica tu código
                </Text>

                <Text style={styles.subtitle}>
                    Ingresa el código de seis dígitos enviado a
                </Text>

                <Text style={styles.phoneText}>{phone}</Text>
                </View>

                <View style={styles.card}>
                <Text style={styles.label}>
                    Código de seguridad
                </Text>

                <TextInput
                    ref={inputRef}
                    style={[
                    styles.codeInput,
                    error ? styles.codeInputError : undefined,
                    ]}
                    placeholder="000000"
                    placeholderTextColor={colors.neutral.gray400}
                    keyboardType="number-pad"
                    autoComplete="one-time-code"
                    maxLength={6}
                    editable={!isSubmitting && !isResending}
                    value={code}
                    onChangeText={handleCodeChange}
                    onSubmitEditing={handleVerify}
                    returnKeyType="done"
                />

                {error ? (
                    <Text style={styles.errorText}>{error}</Text>
                ) : (
                    <Text style={styles.helperText}>
                    El código expira según la configuración de seguridad
                    de BeeApp.
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
                    disabled={isSubmitting || isResending}
                    onPress={handleVerify}
                >
                    {isSubmitting ? (
                    <ActivityIndicator color={colors.neutral.white} />
                    ) : (
                    <Text style={styles.primaryButtonText}>
                        Verificar código
                    </Text>
                    )}
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.resendButton}
                    activeOpacity={0.7}
                    disabled={isSubmitting || isResending}
                    onPress={handleResend}
                >
                    {isResending ? (
                    <ActivityIndicator
                        size="small"
                        color={colors.brand.primary}
                    />
                    ) : (
                    <Text style={styles.resendButtonText}>
                        Reenviar código
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
        paddingHorizontal: 24,
        paddingVertical: 16,
    },
    backButton: {
        alignItems: 'center',
        alignSelf: 'flex-start',
        flexDirection: 'row',
        paddingVertical: 6,
    },
    backButtonText: {
        color: colors.neutral.gray700,
        fontSize: 13,
        fontWeight: '500',
    },
    logoContainer: {
        alignItems: 'center',
        marginBottom: 14,
        marginTop: Platform.OS === 'ios' ? 28 : 16,
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
        textAlign: 'center',
    },
    phoneText: {
        color: colors.neutral.text,
        fontSize: 14,
        fontWeight: '700',
        marginTop: 4,
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
        textAlign: 'center',
    },
    codeInput: {
        backgroundColor: colors.neutral.white,
        borderColor: colors.neutral.gray200,
        borderRadius: 12,
        borderWidth: 1,
        color: colors.neutral.text,
        fontSize: 24,
        fontWeight: '700',
        height: 58,
        letterSpacing: 9,
        paddingHorizontal: 16,
        textAlign: 'center',
    },
    codeInputError: {
        borderColor: colors.semantic.error,
    },
    helperText: {
        color: colors.neutral.gray500,
        fontSize: 11,
        lineHeight: 16,
        marginTop: 8,
        textAlign: 'center',
    },
    errorText: {
        color: colors.semantic.error,
        fontSize: 11,
        lineHeight: 16,
        marginTop: 8,
        textAlign: 'center',
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
    resendButton: {
        alignItems: 'center',
        minHeight: 42,
        justifyContent: 'center',
        marginTop: 8,
    },
    resendButtonText: {
        color: colors.brand.primary,
        fontSize: 13,
        fontWeight: '700',
    },
    messageBox: {
        backgroundColor: '#F7F4FF',
        borderColor: '#DDD2FF',
        borderRadius: 10,
        borderWidth: 1,
        marginTop: 10,
        padding: 11,
    },
    messageText: {
        color: colors.neutral.gray700,
        fontSize: 12,
        lineHeight: 17,
        textAlign: 'center',
    },
});