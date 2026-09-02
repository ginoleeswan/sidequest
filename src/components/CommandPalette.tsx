import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter, type Href } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { ALL_SECTIONS } from '@/constants/categories';
import { useLibrary } from '@/lib/library';
import { COLORS } from '@/styles/colors';
import { RADIUS, SPACING } from '@/styles/theme';
import { TYPE } from '@/styles/typography';

/**
 * Everywhere in the app, from the keyboard.
 *
 * Desktop already had "/" for search and Escape to clear it; this is the
 * rest — every screen, every section and every game already saved,
 * behind one shortcut people already have in their fingers from every
 * other tool they use.
 *
 * Web only, deliberately: there is no keyboard to open it with anywhere
 * else, and a floating button nobody asked for is worse than a shortcut
 * only some people find.
 */

interface Command {
  key: string;
  title: string;
  hint?: string;
  run: () => void;
}

export function CommandPalette() {
  const router = useRouter();
  const { entries } = useLibrary();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const input = useRef<TextInput | null>(null);

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setOpen((wasOpen) => !wasOpen);
      } else if (event.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const commands = useMemo<Command[]>(() => {
    const go = (path: Href) => () => {
      setOpen(false);
      setQuery('');
      router.push(path);
    };

    return [
      { key: 'home', title: 'Home', hint: 'Storefront', run: go('/') },
      {
        key: 'plan',
        title: 'The Plan',
        hint: 'What you can finish',
        run: go('/plan'),
      },
      { key: 'library', title: 'My Library', run: go('/library') },
      {
        key: 'memcard',
        title: 'Your Memcard',
        hint: 'The year',
        run: go('/memcard'),
      },
      {
        key: 'tidy',
        title: 'Backlog amnesty',
        hint: 'Let some go',
        run: go('/tidy'),
      },
      { key: 'import', title: 'Import from Steam', run: go('/import') },
      ...ALL_SECTIONS.map((section) => ({
        key: `section-${section.key}`,
        title: section.title,
        hint: 'Browse',
        run: go(`/browse/${section.key}`),
      })),
      ...Object.values(entries).map((entry) => ({
        key: `game-${entry.game.id}`,
        title: entry.game.name,
        hint: 'In your library',
        run: go(`/game/${entry.game.id}`),
      })),
    ];
  }, [entries, router]);

  const shown = useMemo(() => {
    const term = query.trim().toLowerCase();
    const matching = term
      ? commands.filter((command) => command.title.toLowerCase().includes(term))
      : commands;
    return matching.slice(0, 8);
  }, [commands, query]);

  if (Platform.OS !== 'web') return null;

  return (
    <Modal
      visible={open}
      transparent
      animationType="fade"
      onRequestClose={() => setOpen(false)}
    >
      <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
        <Pressable style={styles.panel} onPress={() => {}}>
          <View style={styles.searchRow}>
            <Ionicons name="search" size={16} color={COLORS.mediumGrey} />
            <TextInput
              ref={input}
              value={query}
              onChangeText={setQuery}
              placeholder="Go to…"
              placeholderTextColor={COLORS.mediumGrey}
              style={styles.input}
              autoFocus
              onSubmitEditing={() => shown[0]?.run()}
              accessibilityLabel="Go to"
            />
            <Text style={styles.kbd}>esc</Text>
          </View>

          {shown.length === 0 ? (
            <Text style={styles.empty}>Nothing by that name.</Text>
          ) : (
            shown.map((command) => (
              <Pressable
                key={command.key}
                onPress={command.run}
                style={styles.row}
                accessibilityRole="button"
              >
                <Text style={styles.title}>{command.title}</Text>
                {command.hint ? (
                  <Text style={styles.hint}>{command.hint}</Text>
                ) : null}
              </Pressable>
            ))
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(9,12,19,0.72)',
    alignItems: 'center',
    paddingTop: 120,
  },
  panel: {
    width: '100%',
    maxWidth: 520,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.strokeStrong,
    borderRadius: RADIUS.md,
    padding: SPACING.sm,
    gap: 2,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingHorizontal: SPACING.sm,
    paddingBottom: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.stroke,
    marginBottom: SPACING.xs,
  },
  input: {
    ...TYPE.body,
    flex: 1,
    color: COLORS.lightGrey,
    paddingVertical: SPACING.sm,
    outlineWidth: 0,
  },
  kbd: {
    ...TYPE.fine,
    color: COLORS.mediumGrey,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.md,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.sm + 1,
    borderRadius: RADIUS.sm,
  },
  title: {
    ...TYPE.label,
    color: COLORS.lightGrey,
    flexShrink: 1,
  },
  hint: {
    ...TYPE.fine,
    color: COLORS.mediumGrey,
  },
  empty: {
    ...TYPE.caption,
    color: COLORS.mediumGrey,
    padding: SPACING.md,
  },
});
