enum TonePresetId { pure, warm, astral, organ }

class TonePreset {
  const TonePreset({
    required this.id,
    required this.name,
    required this.description,
  });

  final TonePresetId id;
  final String name;
  final String description;
}
