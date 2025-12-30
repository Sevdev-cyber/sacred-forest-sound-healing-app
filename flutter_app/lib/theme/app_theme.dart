import 'package:flutter/material.dart';

class AppTheme {
  static const Color ink = Color(0xFF2F2A1F);
  static const Color softInk = Color(0xFF5C5240);
  static const Color ivory = Color(0xFFF9F3E7);
  static const Color ivoryDeep = Color(0xFFF2E8D6);
  static const Color gold = Color(0xFFD6B46A);
  static const Color goldDark = Color(0xFFB88F4E);

  static ThemeData light() {
    return ThemeData(
      brightness: Brightness.light,
      scaffoldBackgroundColor: ivory,
      colorScheme: const ColorScheme.light(
        primary: gold,
        secondary: goldDark,
        surface: ivory,
        onSurface: ink,
      ),
      textTheme: const TextTheme(
        headlineSmall: TextStyle(
          fontSize: 22,
          fontWeight: FontWeight.w600,
          color: ink,
          letterSpacing: 0.5,
        ),
        titleMedium: TextStyle(
          fontSize: 14,
          fontWeight: FontWeight.w600,
          color: softInk,
          letterSpacing: 1.4,
        ),
        bodyMedium: TextStyle(
          fontSize: 14,
          color: softInk,
          height: 1.4,
        ),
      ),
      sliderTheme: SliderThemeData(
        activeTrackColor: gold,
        inactiveTrackColor: ivoryDeep,
        thumbColor: goldDark,
        overlayColor: gold.withOpacity(0.1),
      ),
    );
  }
}
