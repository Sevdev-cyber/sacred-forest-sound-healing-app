import 'package:supabase_flutter/supabase_flutter.dart';

import '../models/sound_category.dart';
import '../models/sound_config.dart';
import '../models/sound_element.dart';
import 'sound_catalog.dart';

class SoundLibraryRepository {
  SoundLibraryRepository({SupabaseClient? client})
      : _client = client ?? Supabase.instance.client;

  final SupabaseClient _client;

  Future<List<SoundConfig>> fetchSounds() async {
    final response = await _client.from('sound_library').select();
    final rows = List<Map<String, dynamic>>.from(response);

    if (rows.isEmpty) {
      return starterSounds;
    }

    return rows.map(_mapRow).toList();
  }

  SoundConfig _mapRow(Map<String, dynamic> row) {
    final element = _elementFromString(row['category'] as String?);
    final isAtmosphere = element == SoundElement.water;
    return SoundConfig(
      id: row['id'] as String,
      label: row['label'] as String? ?? 'Unknown',
      category: isAtmosphere ? SoundCategory.atmosphere : SoundCategory.tonal,
      element: element,
      baseFrequency: _toDouble(row['base_freq']),
      description: row['description'] as String?,
      previewKey: row['preview_key'] as String?,
      vaultKey: row['vault_key'] as String?,
      color: elementColors[element] ?? elementColors[SoundElement.ether]!,
    );
  }

  SoundElement _elementFromString(String? value) {
    switch (value?.toLowerCase()) {
      case 'earth':
        return SoundElement.earth;
      case 'air':
        return SoundElement.air;
      case 'water':
        return SoundElement.water;
      case 'ether':
      default:
        return SoundElement.ether;
    }
  }

  double? _toDouble(dynamic value) {
    if (value == null) return null;
    if (value is num) return value.toDouble();
    return double.tryParse(value.toString());
  }
}
