import React from 'react';
import { TouchableOpacity, Text, ActivityIndicator, StyleSheet, View, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES, FONTS } from '../constants/theme';

const Button = ({
  title,
  onPress,
  type = 'primary', // 'primary', 'secondary', 'outline', 'text', 'danger'
  size = 'medium', // 'small', 'medium', 'large'
  disabled = false,
  loading = false,
  icon,
  iconPosition = 'left', // 'left' or 'right'
  style,
  textStyle,
  fullWidth = false,
  ...props
}) => {
  // Button type styles
  const getButtonStyle = () => {
    const baseStyle = {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: SIZES.radius,
      opacity: disabled ? 0.6 : 1,
    };

    const sizeStyles = {
      small: {
        paddingVertical: SIZES.base,
        paddingHorizontal: SIZES.padding,
        ...(fullWidth && { width: '100%' }),
      },
      medium: {
        paddingVertical: SIZES.base * 1.5,
        paddingHorizontal: SIZES.padding * 1.5,
        ...(fullWidth && { width: '100%' }),
      },
      large: {
        paddingVertical: SIZES.padding,
        paddingHorizontal: SIZES.padding * 2,
        ...(fullWidth && { width: '100%' }),
      },
    };

    const typeStyles = {
      primary: {
        backgroundColor: COLORS.primary,
        borderWidth: 0,
      },
      secondary: {
        backgroundColor: COLORS.secondary,
        borderWidth: 0,
      },
      outline: {
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderColor: COLORS.primary,
      },
      text: {
        backgroundColor: 'transparent',
        borderWidth: 0,
        paddingHorizontal: SIZES.base,
      },
      danger: {
        backgroundColor: COLORS.error,
        borderWidth: 0,
      },
    };

    return {
      ...baseStyle,
      ...sizeStyles[size],
      ...typeStyles[type],
    };
  };

  // Text color based on button type
  const getTextColor = () => {
    switch (type) {
      case 'outline':
        return COLORS.primary;
      case 'text':
        return COLORS.primary;
      default:
        return COLORS.white;
    }
  };

  // Icon color based on button type
  const getIconColor = () => {
    if (type === 'outline') return COLORS.primary;
    if (type === 'text') return COLORS.primary;
    return COLORS.white;
  };

  // Render icon
  const renderIcon = () => {
    if (!icon) return null;
    
    return (
      <Ionicons
        name={icon}
        size={20}
        color={getIconColor()}
        style={[
          styles.icon,
          iconPosition === 'left' ? styles.iconLeft : styles.iconRight,
          title ? (iconPosition === 'left' ? { marginRight: 8 } : { marginLeft: 8 }) : {},
        ]}
      />
    );
  };

  return (
    <TouchableOpacity
      style={[styles.button, getButtonStyle(), style]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.7}
      {...props}
    >
      {loading ? (
        <ActivityIndicator size="small" color={getIconColor()} />
      ) : (
        <View style={styles.buttonContent}>
          {iconPosition === 'left' && renderIcon()}
          {title && (
            <Text
              style={[
                styles.text,
                { color: getTextColor() },
                textStyle,
              ]}
              numberOfLines={1}
            >
              {title}
            </Text>
          )}
          {iconPosition === 'right' && renderIcon()}
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    ...Platform.select({
      ios: {
        shadowColor: COLORS.darkGray,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    ...FONTS.button,
    textAlign: 'center',
  },
  icon: {
    margin: 0,
  },
  iconLeft: {
    marginRight: 8,
  },
  iconRight: {
    marginLeft: 8,
  },
});

export default Button;