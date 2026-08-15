import {
    useEffect,
    useState,
    } from 'react';
import {
    Modal,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
    } from 'react-native';
import {
    Check,
    X,
    } from 'lucide-react-native';
import {
    colors,
    radii,
    spacing,
    } from '@beeapp/design-system';


interface NoteEntityNameModalProps {
    visible: boolean;
    title: string;
    initialValue?: string;
    placeholder: string;
    submitLabel: string;
    submitting?: boolean;
    onClose: () => void;
    onSubmit: (name: string) => void;
}


export default function NoteEntityNameModal({
    visible,
    title,
    initialValue = '',
    placeholder,
    submitLabel,
    submitting = false,
    onClose,
    onSubmit,
    }: NoteEntityNameModalProps) {
    const [name, setName] = useState(initialValue);

    useEffect(() => {
        if (!visible) {
        return;
        }

        setName(initialValue);
    }, [initialValue, visible]);


    const normalizedName = name.trim();

    return (
        <Modal
        visible={visible}
        transparent
        animationType="slide"
        onRequestClose={onClose}
        >
        <View style={styles.backdrop}>
            <TouchableOpacity
            style={StyleSheet.absoluteFill}
            onPress={onClose}
            activeOpacity={1}
            disabled={submitting}
            />

            <View style={styles.sheet}>
            <View style={styles.header}>
                <Text style={styles.title}>
                {title}
                </Text>

                <TouchableOpacity
                style={styles.closeButton}
                onPress={onClose}
                activeOpacity={0.7}
                disabled={submitting}
                >
                <X
                    size={19}
                    color={colors.neutral.gray600}
                />
                </TouchableOpacity>
            </View>

            <View style={styles.body}>
                <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder={placeholder}
                placeholderTextColor={
                    colors.neutral.gray500
                }
                autoFocus
                editable={!submitting}
                maxLength={120}
                returnKeyType="done"
                onSubmitEditing={() => {
                    if (normalizedName && !submitting) {
                    onSubmit(normalizedName);
                    }
                }}
                />
            </View>

            <TouchableOpacity
                style={[
                styles.submitButton,
                (
                    !normalizedName
                    || submitting
                ) && styles.submitButtonDisabled,
                ]}
                onPress={() => onSubmit(normalizedName)}
                disabled={
                !normalizedName
                || submitting
                }
                activeOpacity={0.8}
            >
                <Check
                size={18}
                color={colors.neutral.white}
                />

                <Text style={styles.submitText}>
                {submitting
                    ? 'Guardando...'
                    : submitLabel}
                </Text>
            </TouchableOpacity>
            </View>
        </View>
        </Modal>
    );
}


const styles = StyleSheet.create({
    backdrop: {
        flex: 1,
        justifyContent: 'flex-end',
        backgroundColor: 'rgba(26, 26, 46, 0.35)',
    },
    sheet: {
        borderTopLeftRadius: 22,
        borderTopRightRadius: 22,
        backgroundColor: colors.neutral.white,
        paddingBottom: spacing.lg,
    },
    header: {
        minHeight: 62,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: colors.neutral.gray100,
    },
    title: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.neutral.text,
    },
    closeButton: {
        padding: 4,
    },
    body: {
        padding: spacing.md,
    },
    input: {
        borderWidth: 1,
        borderColor: colors.neutral.gray200,
        borderRadius: radii.lg,
        paddingHorizontal: 12,
        paddingVertical: 11,
        fontSize: 14,
        fontWeight: '400',
        color: colors.neutral.text,
    },
    submitButton: {
        minHeight: 46,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 7,
        marginHorizontal: spacing.md,
        borderRadius: radii.lg,
        backgroundColor: colors.brand.primary,
    },
    submitButtonDisabled: {
        backgroundColor: colors.neutral.gray400,
    },
    submitText: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.neutral.white,
    },
});