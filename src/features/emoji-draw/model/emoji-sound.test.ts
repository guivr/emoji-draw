import {
  getDefaultPlacementStep,
  getMinPlayIntervalForEmoji,
  getSoundSourceForPlacement,
} from '@/features/emoji-draw/model/emoji-sound';

describe('emoji sound mapping', () => {
  test('returns an ascending default step that loops', () => {
    expect(getDefaultPlacementStep(0)).toBe(0);
    expect(getDefaultPlacementStep(5)).toBe(5);
    expect(getDefaultPlacementStep(11)).toBe(11);
    expect(getDefaultPlacementStep(12)).toBe(0);
  });

  test('uses slower retrigger intervals for longer emoji clips', () => {
    expect(getMinPlayIntervalForEmoji('😀')).toBe(120);
    expect(getMinPlayIntervalForEmoji('❤️')).toBe(240);
    expect(getMinPlayIntervalForEmoji('🔥')).toBe(120);
  });

  test('returns a bundled local source for default emojis', () => {
    expect(getSoundSourceForPlacement('🧠', 8)).toEqual(
      expect.objectContaining({
        cacheKey: 'default:8',
      })
    );
  });

  test('supports emoji-specific overrides while keeping default sequence', () => {
    expect(getSoundSourceForPlacement('💥', 3)).toEqual(
      expect.objectContaining({
        cacheKey: 'emoji:💥',
      })
    );

    expect(getSoundSourceForPlacement('❤️', 3)).toEqual(
      expect.objectContaining({
        cacheKey: 'emoji:❤️',
      })
    );

    expect(getSoundSourceForPlacement('👁️', 3)).toEqual(
      expect.objectContaining({
        cacheKey: 'emoji:👁️',
      })
    );

    expect(getSoundSourceForPlacement('🌀', 3)).toEqual(
      expect.objectContaining({
        cacheKey: 'emoji:🌀',
      })
    );

    expect(getSoundSourceForPlacement('🧠', 3)).toEqual(
      expect.objectContaining({
        cacheKey: 'default:3',
      })
    );
  });

  test('randomizes among bundled poop sound variants', () => {
    const randomSpy = jest
      .spyOn(Math, 'random')
      .mockReturnValueOnce(0)
      .mockReturnValueOnce(0.99);

    expect(getSoundSourceForPlacement('💩', 3)).toEqual(
      expect.objectContaining({
        cacheKey: 'emoji:💩:0',
      })
    );

    expect(getSoundSourceForPlacement('💩', 3)).toEqual(
      expect.objectContaining({
        cacheKey: 'emoji:💩:4',
      })
    );

    randomSpy.mockRestore();
  });

  test('randomizes among bundled fire sound variants', () => {
    const randomSpy = jest
      .spyOn(Math, 'random')
      .mockReturnValueOnce(0)
      .mockReturnValueOnce(0.99);

    expect(getSoundSourceForPlacement('🔥', 3)).toEqual(
      expect.objectContaining({
        cacheKey: 'emoji:🔥:0',
      })
    );

    expect(getSoundSourceForPlacement('🔥', 3)).toEqual(
      expect.objectContaining({
        cacheKey: 'emoji:🔥:2',
      })
    );

    randomSpy.mockRestore();
  });

  test('randomizes among bundled laugh sound variants', () => {
    const randomSpy = jest
      .spyOn(Math, 'random')
      .mockReturnValueOnce(0)
      .mockReturnValueOnce(0.99);

    expect(getSoundSourceForPlacement('😂', 3)).toEqual(
      expect.objectContaining({
        cacheKey: 'emoji:😂:0',
      })
    );

    expect(getSoundSourceForPlacement('😂', 3)).toEqual(
      expect.objectContaining({
        cacheKey: 'emoji:😂:5',
      })
    );

    randomSpy.mockRestore();
  });

  test('randomizes among bundled baby sound variants', () => {
    const randomSpy = jest
      .spyOn(Math, 'random')
      .mockReturnValueOnce(0)
      .mockReturnValueOnce(0.99);

    expect(getSoundSourceForPlacement('👶', 3)).toEqual(
      expect.objectContaining({
        cacheKey: 'emoji:👶:0',
      })
    );

    expect(getSoundSourceForPlacement('👶', 3)).toEqual(
      expect.objectContaining({
        cacheKey: 'emoji:👶:6',
      })
    );

    randomSpy.mockRestore();
  });

  test('randomizes among bundled alien sound variants', () => {
    const randomSpy = jest
      .spyOn(Math, 'random')
      .mockReturnValueOnce(0)
      .mockReturnValueOnce(0.99);

    expect(getSoundSourceForPlacement('👽', 3)).toEqual(
      expect.objectContaining({
        cacheKey: 'emoji:👽:0',
      })
    );

    expect(getSoundSourceForPlacement('👽', 3)).toEqual(
      expect.objectContaining({
        cacheKey: 'emoji:👽:4',
      })
    );

    randomSpy.mockRestore();
  });

  test('randomizes among bundled money sound variants', () => {
    const randomSpy = jest
      .spyOn(Math, 'random')
      .mockReturnValueOnce(0)
      .mockReturnValueOnce(0.99);

    expect(getSoundSourceForPlacement('💵', 3)).toEqual(
      expect.objectContaining({
        cacheKey: 'emoji:💵:0',
      })
    );

    expect(getSoundSourceForPlacement('💵', 3)).toEqual(
      expect.objectContaining({
        cacheKey: 'emoji:💵:4',
      })
    );

    randomSpy.mockRestore();
  });

  test('randomizes among bundled jump sound variants', () => {
    const randomSpy = jest
      .spyOn(Math, 'random')
      .mockReturnValueOnce(0)
      .mockReturnValueOnce(0.99);

    expect(getSoundSourceForPlacement('🕴️', 3)).toEqual(
      expect.objectContaining({
        cacheKey: 'emoji:🕴️:0',
      })
    );

    expect(getSoundSourceForPlacement('🕴️', 3)).toEqual(
      expect.objectContaining({
        cacheKey: 'emoji:🕴️:2',
      })
    );

    randomSpy.mockRestore();
  });

  test('randomizes among bundled drum sound variants', () => {
    const randomSpy = jest
      .spyOn(Math, 'random')
      .mockReturnValueOnce(0)
      .mockReturnValueOnce(0.99);

    expect(getSoundSourceForPlacement('🥁', 3)).toEqual(
      expect.objectContaining({
        cacheKey: 'emoji:🥁:0',
      })
    );

    expect(getSoundSourceForPlacement('🥁', 3)).toEqual(
      expect.objectContaining({
        cacheKey: 'emoji:🥁:2',
      })
    );

    randomSpy.mockRestore();
  });

  test('randomizes among bundled trumpet sound variants', () => {
    const randomSpy = jest
      .spyOn(Math, 'random')
      .mockReturnValueOnce(0)
      .mockReturnValueOnce(0.99);

    expect(getSoundSourceForPlacement('🎺', 3)).toEqual(
      expect.objectContaining({
        cacheKey: 'emoji:🎺:0',
      })
    );

    expect(getSoundSourceForPlacement('🎺', 3)).toEqual(
      expect.objectContaining({
        cacheKey: 'emoji:🎺:2',
      })
    );

    randomSpy.mockRestore();
  });

  test('randomizes among bundled guitar sound variants', () => {
    const randomSpy = jest
      .spyOn(Math, 'random')
      .mockReturnValueOnce(0)
      .mockReturnValueOnce(0.99);

    expect(getSoundSourceForPlacement('🎸', 3)).toEqual(
      expect.objectContaining({
        cacheKey: 'emoji:🎸:0',
      })
    );

    expect(getSoundSourceForPlacement('🎸', 3)).toEqual(
      expect.objectContaining({
        cacheKey: 'emoji:🎸:2',
      })
    );

    randomSpy.mockRestore();
  });

  test('randomizes among bundled clap sound variants', () => {
    const randomSpy = jest
      .spyOn(Math, 'random')
      .mockReturnValueOnce(0)
      .mockReturnValueOnce(0.99);

    expect(getSoundSourceForPlacement('👏', 3)).toEqual(
      expect.objectContaining({
        cacheKey: 'emoji:👏:0',
      })
    );

    expect(getSoundSourceForPlacement('👏', 3)).toEqual(
      expect.objectContaining({
        cacheKey: 'emoji:👏:2',
      })
    );

    randomSpy.mockRestore();
  });

  test('randomizes among bundled wow sound variants', () => {
    const randomSpy = jest
      .spyOn(Math, 'random')
      .mockReturnValueOnce(0)
      .mockReturnValueOnce(0.99);

    expect(getSoundSourceForPlacement('🤩', 3)).toEqual(
      expect.objectContaining({
        cacheKey: 'emoji:🤩:0',
      })
    );

    expect(getSoundSourceForPlacement('🤩', 3)).toEqual(
      expect.objectContaining({
        cacheKey: 'emoji:🤩:2',
      })
    );

    randomSpy.mockRestore();
  });

  test('randomizes among bundled party sound variants', () => {
    const randomSpy = jest
      .spyOn(Math, 'random')
      .mockReturnValueOnce(0)
      .mockReturnValueOnce(0.99);

    expect(getSoundSourceForPlacement('🎉', 3)).toEqual(
      expect.objectContaining({
        cacheKey: 'emoji:🎉:0',
      })
    );

    expect(getSoundSourceForPlacement('🎉', 3)).toEqual(
      expect.objectContaining({
        cacheKey: 'emoji:🎉:2',
      })
    );

    randomSpy.mockRestore();
  });

  test('randomizes among bundled siren sound variants', () => {
    const randomSpy = jest
      .spyOn(Math, 'random')
      .mockReturnValueOnce(0)
      .mockReturnValueOnce(0.99);

    expect(getSoundSourceForPlacement('🚨', 3)).toEqual(
      expect.objectContaining({
        cacheKey: 'emoji:🚨:0',
      })
    );

    expect(getSoundSourceForPlacement('🚨', 3)).toEqual(
      expect.objectContaining({
        cacheKey: 'emoji:🚨:2',
      })
    );

    randomSpy.mockRestore();
  });

  test('randomizes among bundled phone sound variants', () => {
    const randomSpy = jest
      .spyOn(Math, 'random')
      .mockReturnValueOnce(0)
      .mockReturnValueOnce(0.99);

    expect(getSoundSourceForPlacement('📱', 3)).toEqual(
      expect.objectContaining({
        cacheKey: 'emoji:📱:0',
      })
    );

    expect(getSoundSourceForPlacement('📱', 3)).toEqual(
      expect.objectContaining({
        cacheKey: 'emoji:📱:4',
      })
    );

    randomSpy.mockRestore();
  });

  test('randomizes among bundled sword sound variants', () => {
    const randomSpy = jest
      .spyOn(Math, 'random')
      .mockReturnValueOnce(0)
      .mockReturnValueOnce(0.99);

    expect(getSoundSourceForPlacement('⚔️', 3)).toEqual(
      expect.objectContaining({
        cacheKey: 'emoji:⚔️:0',
      })
    );

    expect(getSoundSourceForPlacement('⚔️', 3)).toEqual(
      expect.objectContaining({
        cacheKey: 'emoji:⚔️:2',
      })
    );

    randomSpy.mockRestore();
  });

  test('randomizes among bundled cat sound variants', () => {
    const randomSpy = jest
      .spyOn(Math, 'random')
      .mockReturnValueOnce(0)
      .mockReturnValueOnce(0.99);

    expect(getSoundSourceForPlacement('😸', 3)).toEqual(
      expect.objectContaining({
        cacheKey: 'emoji:😸:0',
      })
    );

    expect(getSoundSourceForPlacement('😸', 3)).toEqual(
      expect.objectContaining({
        cacheKey: 'emoji:😸:4',
      })
    );

    randomSpy.mockRestore();
  });

  test('randomizes among bundled dog sound variants', () => {
    const randomSpy = jest
      .spyOn(Math, 'random')
      .mockReturnValueOnce(0)
      .mockReturnValueOnce(0.99);

    expect(getSoundSourceForPlacement('🐶', 3)).toEqual(
      expect.objectContaining({
        cacheKey: 'emoji:🐶:0',
      })
    );

    expect(getSoundSourceForPlacement('🐶', 3)).toEqual(
      expect.objectContaining({
        cacheKey: 'emoji:🐶:3',
      })
    );

    randomSpy.mockRestore();
  });

  test('randomizes among bundled santa sound variants', () => {
    const randomSpy = jest
      .spyOn(Math, 'random')
      .mockReturnValueOnce(0)
      .mockReturnValueOnce(0.99);

    expect(getSoundSourceForPlacement('🎅', 3)).toEqual(
      expect.objectContaining({
        cacheKey: 'emoji:🎅:0',
      })
    );

    expect(getSoundSourceForPlacement('🎅', 3)).toEqual(
      expect.objectContaining({
        cacheKey: 'emoji:🎅:2',
      })
    );

    randomSpy.mockRestore();
  });

  test('randomizes among bundled vomit sound variants', () => {
    const randomSpy = jest
      .spyOn(Math, 'random')
      .mockReturnValueOnce(0)
      .mockReturnValueOnce(0.99);

    expect(getSoundSourceForPlacement('🤢', 3)).toEqual(
      expect.objectContaining({
        cacheKey: 'emoji:🤢:0',
      })
    );

    expect(getSoundSourceForPlacement('🤢', 3)).toEqual(
      expect.objectContaining({
        cacheKey: 'emoji:🤢:4',
      })
    );

    randomSpy.mockRestore();
  });

  test('randomizes among bundled kiss sound variants', () => {
    const randomSpy = jest
      .spyOn(Math, 'random')
      .mockReturnValueOnce(0)
      .mockReturnValueOnce(0.99);

    expect(getSoundSourceForPlacement('💋', 3)).toEqual(
      expect.objectContaining({
        cacheKey: 'emoji:💋:0',
      })
    );

    expect(getSoundSourceForPlacement('💋', 3)).toEqual(
      expect.objectContaining({
        cacheKey: 'emoji:💋:1',
      })
    );

    randomSpy.mockRestore();
  });

  test('randomizes among bundled robot sound variants', () => {
    const randomSpy = jest
      .spyOn(Math, 'random')
      .mockReturnValueOnce(0)
      .mockReturnValueOnce(0.99);

    expect(getSoundSourceForPlacement('🤖', 3)).toEqual(
      expect.objectContaining({
        cacheKey: 'emoji:🤖:0',
      })
    );

    expect(getSoundSourceForPlacement('🤖', 3)).toEqual(
      expect.objectContaining({
        cacheKey: 'emoji:🤖:3',
      })
    );

    randomSpy.mockRestore();
  });

  test('randomizes among bundled bubble sound variants', () => {
    const randomSpy = jest
      .spyOn(Math, 'random')
      .mockReturnValueOnce(0)
      .mockReturnValueOnce(0.99);

    expect(getSoundSourceForPlacement('🫧', 3)).toEqual(
      expect.objectContaining({
        cacheKey: 'emoji:🫧:0',
      })
    );

    expect(getSoundSourceForPlacement('🫧', 3)).toEqual(
      expect.objectContaining({
        cacheKey: 'emoji:🫧:4',
      })
    );

    randomSpy.mockRestore();
  });

  test('randomizes among bundled smile yeah sound variants', () => {
    const randomSpy = jest
      .spyOn(Math, 'random')
      .mockReturnValueOnce(0)
      .mockReturnValueOnce(0.99);

    expect(getSoundSourceForPlacement('😀', 3)).toEqual(
      expect.objectContaining({
        cacheKey: 'emoji:😀:0',
      })
    );

    expect(getSoundSourceForPlacement('😀', 3)).toEqual(
      expect.objectContaining({
        cacheKey: 'emoji:😀:2',
      })
    );

    randomSpy.mockRestore();
  });

  test('randomizes among bundled yay sound variants', () => {
    const randomSpy = jest
      .spyOn(Math, 'random')
      .mockReturnValueOnce(0)
      .mockReturnValueOnce(0.99);

    expect(getSoundSourceForPlacement('🙋‍♂️', 3)).toEqual(
      expect.objectContaining({
        cacheKey: 'emoji:🙋‍♂️:0',
      })
    );

    expect(getSoundSourceForPlacement('🙋‍♂️', 3)).toEqual(
      expect.objectContaining({
        cacheKey: 'emoji:🙋‍♂️:2',
      })
    );

    randomSpy.mockRestore();
  });
});
