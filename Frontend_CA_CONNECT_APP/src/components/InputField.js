import React from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, SIZES } from '../constants/theme';

const InputField = ({
  label,
  placeholder,
  value,
  onChangeText,
  error,
  icon,
  secureTextEntry = false,
  keyboardType = 'default',
  autoCapitalize = 'none',
  autoCorrect = true,
  multiline = false,
  numberOfLines = 1,
  textAlignVertical = 'center',
  returnKeyType = 'done',
  maxLength,
  style,
  inputStyle,
  containerStyle,
  showSecureTextToggle = false,
  onToggleSecureText,
  ...props
}) => {
  const [isFocused, setIsFocused] = React.useState(false);
  const [isSecureText, setIsSecureText] = React.useState(secureTextEntry);

  const handleToggleSecureText = () => {
    setIsSecureText(!isSecureText);
    if (onToggleSecureText) {
      onToggleSecureText(!isSecureText);
    }
  };

  return (
    <View style={[styles.container, containerStyle]}>
      {label && <Text style={styles.label}>{label}</Text>}
      
      <View style={[
        styles.inputContainer,
        isFocused && styles.inputContainerFocused,
        error && styles.inputContainerError,
        multiline && styles.multilineContainer,
        style,
      ]}>
        {icon && (
          <Ionicons 
            name={icon} 
            size={20} 
            color={isFocused ? COLORS.primary : COLORS.mediumGray} 
            style={styles.icon} 
          />
        )}
        
        <TextInput
          style={[
            styles.input,
            multiline && styles.multilineInput,
            { paddingLeft: icon ? 10 : 15 },
            inputStyle,
          ]}
          placeholder={placeholder}
          placeholderTextColor={COLORS.mediumGray}
          value={value}
          onChangeText={onChangeText}
          secureTextEntry={isSecureText}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          autoCorrect={autoCorrect}
          multiline={multiline}
          numberOfLines={multiline ? numberOfLines : 1}
          textAlignVertical={textAlignVertical}
          returnKeyType={returnKeyType}
          maxLength={maxLength}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          blurOnSubmit={!multiline}
          {...props}
        />
        
        {showSecureTextToggle && (
          <TouchableOpacity 
            onPress={handleToggleSecureText}
            style={styles.secureTextToggle}
          >
            <Ionicons 
              name={isSecureText ? 'eye-off-outline' : 'eye-outline'} 
              size={20} 
              color={COLORS.mediumGray} 
            />
          </TouchableOpacity>
        )}
      </View>
      
      {error && (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={14} color={COLORS.error} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: SIZES.base,
  },
  label: {
    ...FONTS.body4,
    color: COLORS.darkGray,
    marginBottom: 4,
    fontWeight: '500',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.lightGray,
    borderRadius: SIZES.radius,
    height: 50,
    paddingHorizontal: 15,
  },
  inputContainerFocused: {
    borderColor: COLORS.primary,
    shadowColor: COLORS.primaryLight,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  inputContainerError: {
    borderColor: COLORS.error,
  },
  multilineContainer: {
    minHeight: 100,
    alignItems: 'flex-start',
    paddingTop: 12,
  },
  icon: {
    marginRight: 5,
  },
  input: {
    flex: 1,
    ...FONTS.body3,
    color: COLORS.darkGray,
    padding: 0,
    height: '100%',
  },
  multilineInput: {
    height: 'auto',
    textAlignVertical: 'top',
    paddingTop: 0,
    paddingBottom: 8,
  },
  secureTextToggle: {
    padding: 5,
    marginLeft: 5,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  errorText: {
    ...FONTS.body5,
    color: COLORS.error,
    marginLeft: 4,
  },
});

export default InputField;