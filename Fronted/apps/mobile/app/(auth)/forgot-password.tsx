import { useState } from 'react';
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
import { useRouter } from 'expo-router';
import {
    ChevronLeft,
    MessageSquare,
    Phone,
    } from 'lucide-react-native';
import { colors } from '@beeapp/design-system';
import { requestPasswordReset } from '@beeapp/api-client';

import BuddyLogo from '../../src/components/BuddyLogo';
import ScreenSafeArea from '../../src/components/layout/ScreenSafeArea';


function normalizePhone(value: string): string {
    const digits = value.replace(/\D/g, '');

    if (!digits) {
        return '';
    }

    return `+${digits}`;
}


function isValidE164Phone(phone: string): boolean {
    return /^\+[1-9]\d{7,14}$/.test(phone);
}


export default function ForgotPasswordScreen() {
    const router = useRouter();

    const [phone, setPhone] = useState('');
    const [error, setError] = useState('');
    const [formMessage, setFormMessage] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleContinue = async () => {
        const normalizedPhone = normalizePhone(phone);

        if (!isValidE164Phone(normalizedPhone)) {
        setError(
            'Ingresa tu número con indicativo de país. Ejemplo: +573001234567.',
        );
        return;
        }

        try {
        setIsSubmitting(true);
        setError('');
        setFormMessage('');

        await requestPasswordReset({
            phone: normalizedPhone,
        });

        router.push({
            pathname: '/(auth)/forgot-password-verify',
            params: {
            phone: normalizedPhone,
            },
        });
        } catch (requestError) {
        setFormMessage(
            requestError instanceof Error
            ? requestError.message
            : 'No fue posible solicitar el código. Inténtalo nuevamente.',
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
                <TouchableOpacity
                style={styles.backButton}
                activeOpacity={0.7}
                disabled={isSubmitting}
                onPress={() => router.back()}
                >
                <ChevronLeft
                    size={20}
                    color={colors.neutral.gray700}
                />

                <Text style={styles.backButtonText}>Volver</Text>
                </TouchableOpacity>

                <View style={styles.logoContainer}>
                <BuddyLogo
                    size={76}
                    showText={false}
                    autoStopAfter={2500}
                />
                </View>

                <View style={styles.header}>
                <View style={styles.iconContainer}>
                    <Phone
                    size={20}
                    color={colors.brand.primary}
                    />
                </View>

                <Text style={styles.title}>
                    Recupera tu contraseña
                </Text>

                <Text style={styles.subtitle}>
                    Ingresa el número de celular vinculado a tu cuenta.
                    Te enviaremos un código de seguridad por SMS.
                </Text>
                </View>

                <View style={styles.card}>
                <Text style={styles.label}>
                    Número de celular
                </Text>

                <View
                    style={[
                    styles.inputContainer,
                    error ? styles.inputError : undefined,
                    ]}
                >
                    <Phone
                    size={18}
                    color={colors.neutral.gray500}
                    />

                    <TextInput
                    style={styles.input}
                    placeholder="+57 300 123 4567"
                    placeholderTextColor={colors.neutral.gray500}
                    keyboardType="phone-pad"
                    autoComplete="tel"
                    editable={!isSubmitting}
                    value={phone}
                    onChangeText={(value) => {
                        setPhone(normalizePhone(value));
                        setError('');
                        setFormMessage('');
                    }}
                    />
                </View>

                {error ? (
                    <Text style={styles.errorText}>{error}</Text>
                ) : (
                    <Text style={styles.helperText}>
                    Incluye el indicativo de país. Por ejemplo: +57 para
                    Colombia.
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
                    onPress={handleContinue}
                >
                    {isSubmitting ? (
                    <ActivityIndicator color={colors.neutral.white} />
                    ) : (
                    <>
                        <Text style={styles.primaryButtonText}>
                        Enviar código
                        </Text>

                        <MessageSquare
                        size={18}
                        color={colors.neutral.white}
                        />
                    </>
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

                <Text style={styles.securityNote}>
                Por seguridad, no confirmaremos si el número está
                registrado en Buddy.
                </Text>
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
        maxWidth: 330,
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
        fontSize: 15,
        marginLeft: 10,
        paddingVertical: 0,
    },
    helperText: {
        color: colors.neutral.gray500,
        fontSize: 11,
        lineHeight: 16,
        marginTop: 7,
    },
    errorText: {
        color: colors.semantic.error,
        fontSize: 11,
        lineHeight: 16,
        marginTop: 7,
    },
    primaryButton: {
        alignItems: 'center',
        backgroundColor: colors.brand.primary,
        borderRadius: 13,
        elevation: 4,
        flexDirection: 'row',
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
        marginRight: 8,
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
    securityNote: {
        color: colors.neutral.gray500,
        fontSize: 11,
        lineHeight: 16,
        marginTop: 18,
        paddingHorizontal: 12,
        textAlign: 'center',
    },
});