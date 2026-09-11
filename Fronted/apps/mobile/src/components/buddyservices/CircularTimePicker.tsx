import {
  Modal,
  Pressable,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Svg, {
  Circle,
  Line,
  Text as SvgText,
} from 'react-native-svg';
import {
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  Check,
  Clock3,
  X,
} from 'lucide-react-native';

type PickerMode = 'hour' | 'minute';

type CircularTimePickerProps = {
  visible: boolean;
  title: string;
  subtitle: string;
  initialValue: string;
  validationMessage?: string | null;
  onClose: () => void;
  onConfirm: (value: string) => void;
  onValueChange?: (value: string) => void;
};

const DIAL_SIZE = 312;
const CENTER = DIAL_SIZE / 2;
const RADIUS = 114;
const MARKER_RADIUS = 123;
const LABEL_RADIUS = 102;

function clamp(
  value: number,
  minimum: number,
  maximum: number,
): number {
  return Math.min(
    Math.max(value, minimum),
    maximum,
  );
}

function normalizeTime(value: string): {
  hour: number;
  minute: number;
} {
  const [hourPart = '09', minutePart = '00'] = (
    String(value || '09:00').trim()
  ).split(':');

  const hour = Number.parseInt(hourPart, 10);
  const minute = Number.parseInt(minutePart, 10);

  return {
    hour: clamp(
      Number.isFinite(hour) ? hour : 9,
      0,
      23,
    ),
    minute: clamp(
      Number.isFinite(minute) ? minute : 0,
      0,
      59,
    ),
  };
}

function formatTime(
  hour: number,
  minute: number,
): string {
  return `${String(hour).padStart(2, '0')}:${String(
    minute,
  ).padStart(2, '0')}`;
}

function pointForStep(
  step: number,
  totalSteps: number,
  radius: number,
): {
  x: number;
  y: number;
} {
  const angle = ((step / totalSteps) * 360) - 90;
  const radians = (angle * Math.PI) / 180;

  return {
    x: CENTER + (Math.cos(radians) * radius),
    y: CENTER + (Math.sin(radians) * radius),
  };
}

function valueFromPosition(
  x: number,
  y: number,
  totalSteps: number,
): number {
  const radians = Math.atan2(
    y - CENTER,
    x - CENTER,
  );
  const degrees = ((radians * 180) / Math.PI) + 90;
  const normalizedDegrees = (
    degrees + 360
  ) % 360;
  const value = Math.round(
    (normalizedDegrees / 360) * totalSteps,
  );

  return value % totalSteps;
}

function hourLabel(hour: number): string {
  return String(hour).padStart(2, '0');
}

function minuteLabel(minute: number): string {
  return String(minute).padStart(2, '0');
}

export default function CircularTimePicker({
  visible,
  title,
  subtitle,
  initialValue,
  validationMessage,
  onClose,
  onConfirm,
  onValueChange,
}: CircularTimePickerProps) {
  const initialTime = useMemo(
    () => normalizeTime(initialValue),
    [initialValue],
  );
  const [mode, setMode] = useState<PickerMode>('hour');
  const [hour, setHour] = useState(initialTime.hour);
  const [minute, setMinute] = useState(initialTime.minute);
  const [isDirectInputFocused, setIsDirectInputFocused] = (
    useState(false)
  );
  const [directInputValue, setDirectInputValue] = useState('');
  const [directInputPreviousValue, setDirectInputPreviousValue] = (
    useState('')
  );
  const [inputWarningMessage, setInputWarningMessage] = useState<
    string | null
  >(null);

  useEffect(() => {
    if (!visible) {
      return;
    }

    setMode('hour');
    setHour(initialTime.hour);
    setMinute(initialTime.minute);
    setIsDirectInputFocused(false);
    setDirectInputValue('');
    setDirectInputPreviousValue('');
    setInputWarningMessage(null);
  }, [
    initialTime.hour,
    initialTime.minute,
    visible,
  ]);

  useEffect(() => {
    if (!visible) {
      return;
    }

    onValueChange?.(formatTime(hour, minute));
  }, [
    hour,
    minute,
    onValueChange,
    visible,
  ]);

  const selectedValue = mode === 'hour'
    ? hour
    : minute;
  const totalSteps = mode === 'hour'
    ? 24
    : 60;
  const selectedPoint = pointForStep(
    selectedValue,
    totalSteps,
    RADIUS,
  );

  const updateFromTouch = (
    x: number,
    y: number,
  ) => {
    const nextValue = valueFromPosition(
      x,
      y,
      totalSteps,
    );

    if (mode === 'hour') {
      setHour(nextValue);
      return;
    }

    setMinute(nextValue);
  };

  const handleTouch = (event: {
    nativeEvent: {
      locationX: number;
      locationY: number;
    };
  }) => {
    updateFromTouch(
      event.nativeEvent.locationX,
      event.nativeEvent.locationY,
    );
  };

  const commitDirectInput = () => {
    const digits = directInputValue.replace(/[^0-9]/g, '');
    const maximum = mode === 'hour' ? 23 : 59;
    const inputLabel = mode === 'hour'
      ? 'La hora'
      : 'Los minutos';
    const previousValue = directInputPreviousValue || (
      mode === 'hour'
        ? String(hour).padStart(2, '0')
        : String(minute).padStart(2, '0')
    );

    const restorePreviousValue = (message: string) => {
      const previousNumber = Number.parseInt(
        previousValue,
        10,
      );

      if (Number.isFinite(previousNumber)) {
        if (mode === 'hour') {
          setHour(previousNumber);
        } else {
          setMinute(previousNumber);
        }
      }

      setDirectInputValue('');
      setIsDirectInputFocused(false);
      setInputWarningMessage(message);
    };

    if (!digits) {
      restorePreviousValue(
        `${inputLabel} es obligatoria. Se restauró el valor anterior (${previousValue}).`,
      );
      return;
    }

    const nextValue = Number.parseInt(digits, 10);

    if (
      !Number.isFinite(nextValue)
      || nextValue < 0
      || nextValue > maximum
    ) {
      restorePreviousValue(
        mode === 'hour'
          ? 'La hora debe estar entre 00 y 23. Se restauró el valor anterior.'
          : 'Los minutos deben estar entre 00 y 59. Se restauró el valor anterior.',
      );
      return;
    }

    if (mode === 'hour') {
      setHour(nextValue);
    } else {
      setMinute(nextValue);
    }

    setDirectInputValue('');
    setIsDirectInputFocused(false);
  };

  const hourLabels = Array.from(
    { length: 8 },
    (_, index) => (index + 1) * 3,
  );
  const minuteLabels = Array.from(
    { length: 12 },
    (_, index) => index * 5,
  );

  return (
    <>
      <Modal
        animationType="fade"
      transparent
      visible={visible}
      onRequestClose={onClose}
    >
      <Pressable
        onPress={onClose}
        style={{
          alignItems: 'center',
          backgroundColor: 'rgba(38, 23, 67, 0.62)',
          flex: 1,
          justifyContent: 'center',
          padding: 18,
        }}
      >
        <Pressable
          onPress={() => undefined}
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: 26,
            maxWidth: 430,
            overflow: 'hidden',
            width: '100%',
          }}
        >
          <View
            style={{
              alignItems: 'center',
              backgroundColor: '#7427D5',
              paddingBottom: 20,
              paddingHorizontal: 20,
              paddingTop: 18,
            }}
          >
            <View
              style={{
                alignItems: 'center',
                flexDirection: 'row',
                justifyContent: 'space-between',
                width: '100%',
              }}
            >
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    color: '#FFFFFF',
                    fontSize: 17,
                    fontWeight: '900',
                  }}
                >
                  {title}
                </Text>

                <Text
                  style={{
                    color: '#EBDCFD',
                    fontSize: 12,
                    marginTop: 3,
                  }}
                >
                  {subtitle}
                </Text>
              </View>

              <TouchableOpacity
                accessibilityLabel="Cerrar selector de hora"
                accessibilityRole="button"
                activeOpacity={0.82}
                onPress={onClose}
                style={{
                  alignItems: 'center',
                  backgroundColor: 'rgba(255,255,255,0.16)',
                  borderRadius: 18,
                  height: 36,
                  justifyContent: 'center',
                  width: 36,
                }}
              >
                <X
                  color="#FFFFFF"
                  size={19}
                />
              </TouchableOpacity>
            </View>

            <View
              style={{
                alignItems: 'center',
                flexDirection: 'row',
                marginTop: 19,
              }}
            >
              <Clock3
                color="#EBDCFD"
                size={21}
              />

              <Text
                style={{
                  color: '#FFFFFF',
                  fontSize: 35,
                  fontWeight: '900',
                  letterSpacing: 1,
                  marginLeft: 9,
                }}
              >
                {formatTime(hour, minute)}
              </Text>
            </View>
          </View>

          <View
            style={{
              paddingHorizontal: 20,
              paddingTop: 18,
            }}
          >
            <View
              style={{
                backgroundColor: '#F4EFF8',
                borderRadius: 15,
                flexDirection: 'row',
                padding: 4,
              }}
            >
              <TouchableOpacity
                accessibilityLabel="Seleccionar horas"
                accessibilityRole="button"
                activeOpacity={0.82}
                onPress={() => setMode('hour')}
                style={{
                  alignItems: 'center',
                  backgroundColor: mode === 'hour'
                    ? '#FFFFFF'
                    : 'transparent',
                  borderRadius: 11,
                  flex: 1,
                  minHeight: 42,
                  justifyContent: 'center',
                }}
              >
                <Text
                  style={{
                    color: mode === 'hour'
                      ? '#54209E'
                      : '#786593',
                    fontSize: 14,
                    fontWeight: '800',
                  }}
                >
                  Hora
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                accessibilityLabel="Seleccionar minutos"
                accessibilityRole="button"
                activeOpacity={0.82}
                onPress={() => setMode('minute')}
                style={{
                  alignItems: 'center',
                  backgroundColor: mode === 'minute'
                    ? '#FFFFFF'
                    : 'transparent',
                  borderRadius: 11,
                  flex: 1,
                  minHeight: 42,
                  justifyContent: 'center',
                }}
              >
                <Text
                  style={{
                    color: mode === 'minute'
                      ? '#54209E'
                      : '#786593',
                    fontSize: 14,
                    fontWeight: '800',
                  }}
                >
                  Minutos
                </Text>
              </TouchableOpacity>
            </View>

            <Text
              style={{
                color: '#786593',
                fontSize: 12,
                lineHeight: 18,
                marginTop: 14,
                textAlign: 'center',
              }}
            >
              {mode === 'hour'
                ? 'Toca o arrastra la aguja para elegir una hora de 1 a 24.'
                : 'Toca o arrastra la aguja para elegir los minutos de 0 a 59.'}
            </Text>

            <View
              style={{
                alignItems: 'center',
                backgroundColor: '#FAF6FF',
                borderColor: '#E7DDF2',
                borderRadius: 14,
                borderWidth: 1,
                flexDirection: 'row',
                marginTop: 14,
                minHeight: 52,
                paddingHorizontal: 13,
              }}
            >
              <Text
                style={{
                  color: '#786593',
                  fontSize: 13,
                  fontWeight: '800',
                }}
              >
                {mode === 'hour'
                  ? 'Hora (00–23)'
                  : 'Minutos (00–59)'}
              </Text>

              <TextInput
                accessibilityLabel={
                  mode === 'hour'
                    ? 'Escribir hora entre 00 y 23'
                    : 'Escribir minutos entre 00 y 59'
                }
                keyboardType="number-pad"
                maxLength={2}
                onBlur={commitDirectInput}
                onChangeText={(rawValue) => {
                  const digits = rawValue.replace(/[^0-9]/g, '');
                  setDirectInputValue(digits);

                  if (!digits) {
                    return;
                  }

                  const nextValue = Number.parseInt(digits, 10);
                  const maximum = mode === 'hour' ? 23 : 59;

                  if (
                    !Number.isFinite(nextValue)
                    || nextValue < 0
                    || nextValue > maximum
                  ) {
                    return;
                  }

                  if (mode === 'hour') {
                    setHour(nextValue);
                  } else {
                    setMinute(nextValue);
                  }
                }}
                onFocus={() => {
                  const currentValue = mode === 'hour'
                    ? String(hour).padStart(2, '0')
                    : String(minute).padStart(2, '0');

                  setDirectInputPreviousValue(currentValue);
                  setIsDirectInputFocused(true);
                  setDirectInputValue('');
                }}
                placeholder="00"
                placeholderTextColor="#A692B7"
                style={{
                  color: '#54209E',
                  flex: 1,
                  fontSize: 19,
                  fontWeight: '900',
                  marginLeft: 12,
                  paddingVertical: 8,
                  textAlign: 'right',
                }}
                value={
                  isDirectInputFocused
                    ? directInputValue
                    : (
                      mode === 'hour'
                        ? String(hour).padStart(2, '0')
                        : String(minute).padStart(2, '0')
                    )
                }
              />
            </View>

            <View
              style={{
                alignItems: 'center',
                height: DIAL_SIZE,
                justifyContent: 'center',
                marginTop: 8,
              }}
            >
              <Svg
                height={DIAL_SIZE}
                width={DIAL_SIZE}
                onPress={handleTouch}
                onResponderGrant={handleTouch}
                onResponderMove={handleTouch}
                onStartShouldSetResponder={() => true}
                onMoveShouldSetResponder={() => true}
              >
                <Circle
                  cx={CENTER}
                  cy={CENTER}
                  fill="#FAF6FF"
                  r={RADIUS + 26}
                  stroke="#E7DDF2"
                  strokeWidth={1}
                />

                {Array.from(
                  {
                    length: mode === 'hour' ? 24 : 60,
                  },
                  (_, index) => index,
                ).map((markerValue) => {
                  const totalSteps = mode === 'hour' ? 24 : 60;
                  const isMajorMarker = mode === 'hour'
                    ? markerValue % 3 === 0
                    : markerValue % 5 === 0;
                  const outerPoint = pointForStep(
                    markerValue,
                    totalSteps,
                    MARKER_RADIUS + 1,
                  );
                  const innerPoint = pointForStep(
                    markerValue,
                    totalSteps,
                    isMajorMarker
                      ? MARKER_RADIUS - 9
                      : MARKER_RADIUS - 3,
                  );

                  return (
                    <Line
                      key={`${mode}-${markerValue}`}
                      stroke={
                        isMajorMarker
                          ? '#9A86B3'
                          : '#DCCBEE'
                      }
                      strokeWidth={isMajorMarker ? 2 : 1}
                      x1={innerPoint.x}
                      x2={outerPoint.x}
                      y1={innerPoint.y}
                      y2={outerPoint.y}
                    />
                  );
                })}

                <Line
                  stroke="#7427D5"
                  strokeLinecap="round"
                  strokeWidth={4}
                  x1={CENTER}
                  x2={selectedPoint.x}
                  y1={CENTER}
                  y2={selectedPoint.y}
                />

                <Circle
                  cx={selectedPoint.x}
                  cy={selectedPoint.y}
                  fill="#7427D5"
                  r={16}
                />

                <Circle
                  cx={CENTER}
                  cy={CENTER}
                  fill="#7427D5"
                  r={8}
                />

                {mode === 'hour'
                  ? hourLabels.map((hourValue) => {
                    const internalHour = hourValue % 24;

                    if (hour === internalHour) {
                      return null;
                    }

                    const point = pointForStep(
                      internalHour,
                      24,
                      LABEL_RADIUS,
                    );

                    return (
                      <SvgText
                        alignmentBaseline="middle"
                        fill="#4E3B68"
                        fontSize={13}
                        fontWeight="800"
                        key={hourValue}
                        textAnchor="middle"
                        x={point.x}
                        y={point.y + 1}
                      >
                        {hourLabel(internalHour)}
                      </SvgText>
                    );
                  })
                  : minuteLabels.map((minuteValue) => {
                    if (minute === minuteValue) {
                      return null;
                    }

                    const point = pointForStep(
                      minuteValue,
                      60,
                      LABEL_RADIUS,
                    );

                    return (
                      <SvgText
                        alignmentBaseline="middle"
                        fill="#4E3B68"
                        fontSize={12}
                        fontWeight="800"
                        key={minuteValue}
                        textAnchor="middle"
                        x={point.x}
                        y={point.y + 1}
                      >
                        {minuteLabel(minuteValue)}
                      </SvgText>
                    );
                  })}

                <SvgText
                  alignmentBaseline="middle"
                  fill="#FFFFFF"
                  fontSize={13}
                  fontWeight="900"
                  textAnchor="middle"
                  x={selectedPoint.x}
                  y={selectedPoint.y + 1}
                >
                  {mode === 'hour'
                    ? hourLabel(hour)
                    : minuteLabel(minute)}
                </SvgText>
              </Svg>
            </View>

            {validationMessage ? (
              <View
                style={{
                  backgroundColor: '#FEF3F2',
                  borderColor: '#FECDCA',
                  borderRadius: 13,
                  borderWidth: 1,
                  marginTop: 2,
                  padding: 11,
                }}
              >
                <Text
                  style={{
                    color: '#B42318',
                    fontSize: 13,
                    lineHeight: 19,
                    textAlign: 'center',
                  }}
                >
                  {validationMessage}
                </Text>
              </View>
            ) : null}

            <View
              style={{
                flexDirection: 'row',
                gap: 10,
                marginBottom: 20,
                marginTop: 18,
              }}
            >
              <TouchableOpacity
                accessibilityLabel="Cancelar selección de hora"
                accessibilityRole="button"
                activeOpacity={0.82}
                onPress={onClose}
                style={{
                  alignItems: 'center',
                  backgroundColor: '#F4EFF8',
                  borderRadius: 14,
                  flex: 1,
                  justifyContent: 'center',
                  minHeight: 51,
                }}
              >
                <Text
                  style={{
                    color: '#4E3B68',
                    fontSize: 14,
                    fontWeight: '800',
                  }}
                >
                  Cancelar
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                accessibilityLabel="Aplicar hora elegida"
                accessibilityRole="button"
                activeOpacity={0.82}
                disabled={Boolean(validationMessage)}
                onPress={() => {
                  onConfirm(formatTime(hour, minute));
                }}
                style={{
                  alignItems: 'center',
                  backgroundColor: validationMessage
                    ? '#B9A9CB'
                    : '#7427D5',
                  borderRadius: 14,
                  flex: 1.35,
                  flexDirection: 'row',
                  justifyContent: 'center',
                  minHeight: 51,
                }}
              >
                <Check
                  color="#FFFFFF"
                  size={18}
                />

                <Text
                  style={{
                    color: '#FFFFFF',
                    fontSize: 14,
                    fontWeight: '800',
                    marginLeft: 7,
                  }}
                >
                  Aplicar
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </Pressable>
      </Pressable>
      </Modal>

      <Modal
        animationType="fade"
      transparent
      visible={Boolean(inputWarningMessage)}
      onRequestClose={() => {
        setInputWarningMessage(null);
      }}
    >
      <Pressable
        onPress={() => {
          setInputWarningMessage(null);
        }}
        style={{
          alignItems: 'center',
          backgroundColor: 'rgba(38, 23, 67, 0.62)',
          flex: 1,
          justifyContent: 'center',
          padding: 22,
        }}
      >
        <Pressable
          onPress={() => undefined}
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: 22,
            maxWidth: 390,
            padding: 21,
            width: '100%',
          }}
        >
          <View
            style={{
              alignItems: 'center',
              backgroundColor: '#FEF3F2',
              borderRadius: 18,
              height: 58,
              justifyContent: 'center',
              width: 58,
            }}
          >
            <Clock3
              color="#B42318"
              size={28}
            />
          </View>

          <Text
            style={{
              color: '#261743',
              fontSize: 17,
              fontWeight: '900',
              marginTop: 16,
              textAlign: 'center',
            }}
          >
            Valor no válido
          </Text>

          <Text
            style={{
              color: '#786593',
              fontSize: 14,
              lineHeight: 21,
              marginTop: 9,
              textAlign: 'center',
            }}
          >
            {inputWarningMessage || ''}
          </Text>

          <TouchableOpacity
            accessibilityLabel="Entendido"
            accessibilityRole="button"
            activeOpacity={0.82}
            onPress={() => {
              setInputWarningMessage(null);
            }}
            style={{
              alignItems: 'center',
              backgroundColor: '#7427D5',
              borderRadius: 14,
              justifyContent: 'center',
              marginTop: 21,
              minHeight: 50,
            }}
          >
            <Text
              style={{
                color: '#FFFFFF',
                fontSize: 14,
                fontWeight: '800',
              }}
            >
              Entendido
            </Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
      </Modal>
    </>
  );
}
