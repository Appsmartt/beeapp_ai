import { useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Keyboard,
    KeyboardAvoidingView,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    TouchableWithoutFeedback,
    View,
    } from 'react-native';
import { useRouter } from 'expo-router';
import {
    Check,
    ChevronLeft,
    Eye,
    EyeOff,
    LockKeyhole,
    Mail,
    Phone,
    User,
    UserPlus,
    } from 'lucide-react-native';
import { colors } from '@beeapp/design-system';
import { registerUser } from '@beeapp/api-client';
import type { RegisterUserPayload } from '@beeapp/shared-types';

import AnimatedLogo from '../../src/components/AnimatedLogo';
import CountryCodeModal from '../../src/components/contacts/CountryCodeModal';
import ScreenSafeArea from '../../src/components/layout/ScreenSafeArea';
import { COUNTRIES, type Country } from '../../src/mocks/countries';

type FormErrors = {
    firstName?: string;
    lastName?: string;
    email?: string;
    phoneNumber?: string;
    password?: string;
    confirmPassword?: string;
};

const MIN_PASSWORD_LENGTH = 8;

function normalizePhoneNumber(value: string): string {
    return value.replace(/\D/g, '');
}

function isValidEmail(value: string): boolean {
    return /^\S+@\S+\.\S+$/.test(value);
}

export default function RegisterScreen() {
    const router = useRouter();

    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [email, setEmail] = useState('');
    const [phoneNumber, setPhoneNumber] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [acceptedTerms, setAcceptedTerms] = useState(false);
    const [selectedCountry, setSelectedCountry] = useState<Country>(
        COUNTRIES[0],
    );

    const [errors, setErrors] = useState<FormErrors>({});
    const [formError, setFormError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isCountryModalVisible, setIsCountryModalVisible] = useState(false);
    const [isPasswordVisible, setIsPasswordVisible] = useState(false);
    const [isConfirmPasswordVisible, setIsConfirmPasswordVisible] =
        useState(false);

    const passwordStrengthLabel = useMemo(() => {
        if (!password) {
        return 'Use at least 8 characters.';
        }

        if (password.length < MIN_PASSWORD_LENGTH) {
        return `${MIN_PASSWORD_LENGTH - password.length} more characters required.`;
        }

        return 'Password length is valid.';
    }, [password]);

    const clearFieldError = (field: keyof FormErrors) => {
        setErrors((currentErrors) => ({
        ...currentErrors,
        [field]: undefined,
        }));

        if (formError) {
        setFormError('');
        }
    };

    const validateForm = (): boolean => {
        const nextErrors: FormErrors = {};
        const normalizedPhoneNumber = normalizePhoneNumber(phoneNumber);

        if (!firstName.trim()) {
        nextErrors.firstName = 'Ingresa tu nombre.';
        }

        if (!lastName.trim()) {
        nextErrors.lastName = 'Ingresa tu apellido.';
        }

        if (!email.trim()) {
        nextErrors.email = 'Ingresa tu correo electrónico.';
        } else if (!isValidEmail(email.trim())) {
        nextErrors.email = 'Ingresa un correo electrónico válido.';
        }

        if (!normalizedPhoneNumber) {
        nextErrors.phoneNumber = 'Ingresa tu número de celular.';
        } else if (normalizedPhoneNumber.length < 7) {
        nextErrors.phoneNumber = 'Ingresa un número de celular válido.';
        }

        if (password.length < MIN_PASSWORD_LENGTH) {
        nextErrors.password =
            'La contraseña debe tener al menos 8 caracteres.';
        }

        if (password !== confirmPassword) {
        nextErrors.confirmPassword = 'Las contraseñas no coinciden.';
        }

        if (!acceptedTerms) {
        setFormError(
            'Debes aceptar los Términos y Condiciones para crear una cuenta.',
        );
        } else {
        setFormError('');
        }

        setErrors(nextErrors);

        return Object.keys(nextErrors).length === 0 && acceptedTerms;
    };

    const handleRegister = async () => {
        if (!validateForm()) {
        return;
        }

        const payload: RegisterUserPayload = {
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        email: email.trim().toLowerCase(),
        password,
        phone_dial_code: selectedCountry.dialCode.replace('+', ''),
        phone_number: normalizePhoneNumber(phoneNumber),
        };

        try {
        setIsSubmitting(true);
        setFormError('');

        const response = await registerUser(payload);

        Alert.alert(
            'Cuenta creada',
            `Bienvenido a BeeApp AI, ${response.user.first_name}. Tu cuenta y perfil fueron creados correctamente.`,
            [
            {
                text: 'Ir a iniciar sesión',
                onPress: () => router.replace('/(auth)/login'),
            },
            ],
        );
        } catch (error) {
        setFormError(
            error instanceof Error
            ? error.message
            : 'No fue posible crear la cuenta. Inténtalo nuevamente.',
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
            <ScrollView
                contentContainerStyle={styles.scrollContent}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
            >
                <TouchableOpacity
                style={styles.backButton}
                activeOpacity={0.7}
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
                    size={64}
                    showText={false}
                    autoStopAfter={2500}
                />
                </View>

                <View style={styles.header}>
                <View style={styles.headerIcon}>
                    <UserPlus
                    size={20}
                    color={colors.brand.primary}
                    />
                </View>

                <Text style={styles.title}>Crea tu cuenta</Text>

                <Text style={styles.subtitle}>
                    Completa tus datos para crear tu usuario y perfil en BeeApp AI.
                </Text>
                </View>

                {formError ? (
                <View style={styles.formErrorBox}>
                    <Text style={styles.formErrorText}>{formError}</Text>
                </View>
                ) : null}

                <View style={styles.formCard}>
                <Text style={styles.sectionTitle}>Datos personales</Text>

                <View style={styles.row}>
                    <Field
                    containerStyle={styles.halfField}
                    label="Nombre"
                    value={firstName}
                    placeholder="Tu nombre"
                    autoComplete="given-name"
                    icon={<User size={17} color={colors.neutral.gray500} />}
                    error={errors.firstName}
                    onChangeText={(value) => {
                        setFirstName(value);
                        clearFieldError('firstName');
                    }}
                    />

                    <Field
                    containerStyle={styles.halfField}
                    label="Apellido"
                    value={lastName}
                    placeholder="Tu apellido"
                    autoComplete="family-name"
                    icon={<User size={17} color={colors.neutral.gray500} />}
                    error={errors.lastName}
                    onChangeText={(value) => {
                        setLastName(value);
                        clearFieldError('lastName');
                    }}
                    />
                </View>

                <Field
                    label="Correo electrónico"
                    value={email}
                    placeholder="tu@correo.com"
                    autoComplete="email"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    icon={<Mail size={17} color={colors.neutral.gray500} />}
                    error={errors.email}
                    onChangeText={(value) => {
                    setEmail(value);
                    clearFieldError('email');
                    }}
                />

                <View style={styles.fieldContainer}>
                    <Text style={styles.label}>Número de celular</Text>

                    <View
                    style={[
                        styles.phoneContainer,
                        errors.phoneNumber && styles.inputError,
                    ]}
                    >
                    <TouchableOpacity
                        style={styles.countryButton}
                        activeOpacity={0.7}
                        onPress={() => setIsCountryModalVisible(true)}
                    >
                        <Text style={styles.countryFlag}>
                        {selectedCountry.flag}
                        </Text>

                        <Text style={styles.countryCode}>
                        {selectedCountry.dialCode}
                        </Text>
                    </TouchableOpacity>

                    <View style={styles.phoneDivider} />

                    <Phone
                        size={17}
                        color={colors.neutral.gray500}
                    />

                    <TextInput
                        style={styles.phoneInput}
                        placeholder="300 000 0000"
                        placeholderTextColor={colors.neutral.gray500}
                        keyboardType="number-pad"
                        maxLength={15}
                        value={phoneNumber}
                        onChangeText={(value) => {
                        setPhoneNumber(value.replace(/\D/g, ''));
                        clearFieldError('phoneNumber');
                        }}
                    />
                    </View>

                    {errors.phoneNumber ? (
                    <Text style={styles.errorText}>
                        {errors.phoneNumber}
                    </Text>
                    ) : (
                    <Text style={styles.helperText}>
                        Usaremos este número para asociar tu cuenta.
                    </Text>
                    )}
                </View>

                <Text style={styles.sectionTitle}>Seguridad</Text>

                <PasswordField
                    label="Contraseña"
                    value={password}
                    visible={isPasswordVisible}
                    error={errors.password}
                    helperText={passwordStrengthLabel}
                    onToggleVisibility={() => {
                    setIsPasswordVisible((currentValue) => !currentValue);
                    }}
                    onChangeText={(value) => {
                    setPassword(value);
                    clearFieldError('password');
                    }}
                />

                <PasswordField
                    label="Confirmar contraseña"
                    value={confirmPassword}
                    visible={isConfirmPasswordVisible}
                    error={errors.confirmPassword}
                    onToggleVisibility={() => {
                    setIsConfirmPasswordVisible(
                        (currentValue) => !currentValue,
                    );
                    }}
                    onChangeText={(value) => {
                    setConfirmPassword(value);
                    clearFieldError('confirmPassword');
                    }}
                />

                <TouchableOpacity
                    style={styles.termsRow}
                    activeOpacity={0.7}
                    onPress={() => setAcceptedTerms((currentValue) => !currentValue)}
                >
                    <View
                    style={[
                        styles.checkbox,
                        acceptedTerms && styles.checkboxSelected,
                    ]}
                    >
                    {acceptedTerms ? (
                        <Check
                        size={13}
                        color={colors.neutral.white}
                        strokeWidth={3}
                        />
                    ) : null}
                    </View>

                    <Text style={styles.termsText}>
                    Acepto los{' '}

                    <Text
                        style={styles.termsLink}
                        onPress={() => router.push('/(auth)/terms')}
                    >
                        Términos y Condiciones
                    </Text>

                    {' '}y la{' '}

                    <Text
                        style={styles.termsLink}
                        onPress={() => router.push('/(auth)/privacy')}
                    >
                        Política de Privacidad
                    </Text>

                    {' '}de BeeApp AI.
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[
                    styles.registerButton,
                    isSubmitting && styles.registerButtonDisabled,
                    ]}
                    activeOpacity={0.8}
                    disabled={isSubmitting}
                    onPress={handleRegister}
                >
                    {isSubmitting ? (
                    <ActivityIndicator color={colors.neutral.white} />
                    ) : (
                    <>
                        <Text style={styles.registerButtonText}>
                        Crear cuenta
                        </Text>

                        <UserPlus
                        size={18}
                        color={colors.neutral.white}
                        />
                    </>
                    )}
                </TouchableOpacity>
                </View>

                <View style={styles.loginRow}>
                <Text style={styles.loginText}>¿Ya tienes una cuenta?</Text>

                <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={() => router.replace('/(auth)/login')}
                >
                    <Text style={styles.loginLink}>Inicia sesión</Text>
                </TouchableOpacity>
                </View>
            </ScrollView>
            </TouchableWithoutFeedback>
        </KeyboardAvoidingView>

        <CountryCodeModal
            visible={isCountryModalVisible}
            onClose={() => setIsCountryModalVisible(false)}
            onSelect={(country) => {
            setSelectedCountry(country);
            setIsCountryModalVisible(false);
            clearFieldError('phoneNumber');
            }}
        />
        </ScreenSafeArea>
    );
}

interface FieldProps {
    label: string;
    value: string;
    placeholder: string;
    autoComplete: 'given-name' | 'family-name' | 'email';
    icon: React.ReactNode;
    error?: string;
    containerStyle?: object;
    keyboardType?: 'default' | 'email-address';
    autoCapitalize?: 'none' | 'sentences' | 'words';
    onChangeText: (value: string) => void;
}

function Field({
    label,
    value,
    placeholder,
    autoComplete,
    icon,
    error,
    containerStyle,
    keyboardType = 'default',
    autoCapitalize = 'words',
    onChangeText,
    }: FieldProps) {
    return (
        <View style={[styles.fieldContainer, containerStyle]}>
        <Text style={styles.label}>{label}</Text>

        <View style={[styles.input, error && styles.inputError]}>
            {icon}

            <TextInput
            style={styles.textInput}
            value={value}
            placeholder={placeholder}
            placeholderTextColor={colors.neutral.gray500}
            autoComplete={autoComplete}
            autoCapitalize={autoCapitalize}
            keyboardType={keyboardType}
            onChangeText={onChangeText}
            />
        </View>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}
        </View>
    );
}

interface PasswordFieldProps {
    label: string;
    value: string;
    visible: boolean;
    error?: string;
    helperText?: string;
    onToggleVisibility: () => void;
    onChangeText: (value: string) => void;
}

function PasswordField({
    label,
    value,
    visible,
    error,
    helperText,
    onToggleVisibility,
    onChangeText,
    }: PasswordFieldProps) {
    return (
        <View style={styles.fieldContainer}>
        <Text style={styles.label}>{label}</Text>

        <View style={[styles.input, error && styles.inputError]}>
            <LockKeyhole size={17} color={colors.neutral.gray500} />

            <TextInput
            style={styles.textInput}
            value={value}
            placeholder="Mínimo 8 caracteres"
            placeholderTextColor={colors.neutral.gray500}
            autoComplete="new-password"
            autoCapitalize="none"
            secureTextEntry={!visible}
            onChangeText={onChangeText}
            />

            <TouchableOpacity
            style={styles.visibilityButton}
            activeOpacity={0.7}
            onPress={onToggleVisibility}
            >
            {visible ? (
                <EyeOff size={18} color={colors.neutral.gray500} />
            ) : (
                <Eye size={18} color={colors.neutral.gray500} />
            )}
            </TouchableOpacity>
        </View>

        {error ? (
            <Text style={styles.errorText}>{error}</Text>
        ) : helperText ? (
            <Text style={styles.helperText}>{helperText}</Text>
        ) : null}
        </View>
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
    scrollContent: {
        flexGrow: 1,
        paddingHorizontal: 20,
        paddingTop: 12,
        paddingBottom: 32,
    },
    backButton: {
        alignItems: 'center',
        alignSelf: 'flex-start',
        flexDirection: 'row',
        marginBottom: 12,
        paddingVertical: 6,
    },
    backButtonText: {
        color: colors.neutral.gray700,
        fontSize: 13,
        fontWeight: '500',
        marginLeft: 2,
    },
    logoContainer: {
        alignItems: 'center',
        marginBottom: 12,
    },
    header: {
        alignItems: 'center',
        marginBottom: 22,
    },
    headerIcon: {
        alignItems: 'center',
        backgroundColor: '#F0EAFF',
        borderRadius: 14,
        height: 42,
        justifyContent: 'center',
        marginBottom: 10,
        width: 42,
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
        fontSize: 13,
        lineHeight: 19,
        maxWidth: 320,
        textAlign: 'center',
    },
    formErrorBox: {
        backgroundColor: '#FEF2F2',
        borderColor: '#FECACA',
        borderRadius: 12,
        borderWidth: 1,
        marginBottom: 14,
        padding: 12,
    },
    formErrorText: {
        color: colors.semantic.error,
        fontSize: 12,
        lineHeight: 18,
    },
    formCard: {
        backgroundColor: colors.neutral.white,
        borderColor: colors.neutral.gray200,
        borderRadius: 20,
        borderWidth: 1,
        elevation: 2,
        padding: 16,
        shadowColor: colors.brand.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 12,
    },
    sectionTitle: {
        color: colors.neutral.gray700,
        fontSize: 11,
        fontWeight: '700',
        letterSpacing: 0.7,
        marginBottom: 14,
        marginTop: 4,
        textTransform: 'uppercase',
    },
    row: {
        flexDirection: 'row',
        gap: 10,
    },
    halfField: {
        flex: 1,
    },
    fieldContainer: {
        marginBottom: 15,
    },
    label: {
        color: colors.neutral.gray700,
        fontSize: 12,
        fontWeight: '600',
        marginBottom: 7,
    },
    input: {
        alignItems: 'center',
        backgroundColor: colors.neutral.white,
        borderColor: colors.neutral.gray200,
        borderRadius: 12,
        borderWidth: 1,
        flexDirection: 'row',
        height: 48,
        paddingHorizontal: 13,
    },
    inputError: {
        borderColor: colors.semantic.error,
    },
    textInput: {
        color: colors.neutral.text,
        flex: 1,
        fontSize: 14,
        marginLeft: 9,
        paddingVertical: 0,
    },
    visibilityButton: {
        padding: 4,
    },
    phoneContainer: {
        alignItems: 'center',
        backgroundColor: colors.neutral.white,
        borderColor: colors.neutral.gray200,
        borderRadius: 12,
        borderWidth: 1,
        flexDirection: 'row',
        height: 48,
        paddingRight: 13,
    },
    countryButton: {
        alignItems: 'center',
        flexDirection: 'row',
        paddingHorizontal: 11,
    },
    countryFlag: {
        fontSize: 17,
        marginRight: 5,
    },
    countryCode: {
        color: colors.neutral.text,
        fontSize: 13,
        fontWeight: '600',
    },
    phoneDivider: {
        backgroundColor: colors.neutral.gray200,
        height: 24,
        marginRight: 10,
        width: 1,
    },
    phoneInput: {
        color: colors.neutral.text,
        flex: 1,
        fontSize: 14,
        marginLeft: 9,
        paddingVertical: 0,
    },
    helperText: {
        color: colors.neutral.gray500,
        fontSize: 11,
        lineHeight: 16,
        marginTop: 5,
    },
    errorText: {
        color: colors.semantic.error,
        fontSize: 11,
        lineHeight: 16,
        marginTop: 5,
    },
    termsRow: {
        alignItems: 'flex-start',
        flexDirection: 'row',
        marginBottom: 20,
        marginTop: 2,
    },
    checkbox: {
        alignItems: 'center',
        borderColor: colors.neutral.gray300,
        borderRadius: 5,
        borderWidth: 1.5,
        height: 18,
        justifyContent: 'center',
        marginRight: 9,
        marginTop: 1,
        width: 18,
    },
    checkboxSelected: {
        backgroundColor: colors.brand.primary,
        borderColor: colors.brand.primary,
    },
    termsText: {
        color: colors.neutral.gray600,
        flex: 1,
        fontSize: 11,
        lineHeight: 17,
    },
    termsLink: {
        color: colors.brand.primary,
        fontWeight: '600',
    },
    registerButton: {
        alignItems: 'center',
        backgroundColor: colors.brand.primary,
        borderRadius: 13,
        elevation: 4,
        flexDirection: 'row',
        height: 50,
        justifyContent: 'center',
        shadowColor: colors.brand.primary,
        shadowOffset: { width: 0, height: 5 },
        shadowOpacity: 0.22,
        shadowRadius: 9,
    },
    registerButtonDisabled: {
        opacity: 0.7,
    },
    registerButtonText: {
        color: colors.neutral.white,
        fontSize: 15,
        fontWeight: '700',
        marginRight: 8,
    },
    loginRow: {
        alignItems: 'center',
        flexDirection: 'row',
        justifyContent: 'center',
        marginTop: 22,
    },
    loginText: {
        color: colors.neutral.gray600,
        fontSize: 13,
        marginRight: 5,
    },
    loginLink: {
        color: colors.brand.primary,
        fontSize: 13,
        fontWeight: '700',
    },
});