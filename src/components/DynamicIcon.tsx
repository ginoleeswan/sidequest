import {
  Feather,
  FontAwesome5,
  Ionicons,
  MaterialCommunityIcons,
  MaterialIcons,
} from '@expo/vector-icons';

export type IconType =
  | 'feather'
  | 'font-awesome-5'
  | 'ionicon'
  | 'material-community'
  | 'material-icons';

interface Props {
  type: IconType;
  name: string;
  size?: number;
  color?: string;
}

/** Icon resolved by family name — replaces react-native-elements' <Icon type=...>. */
export function DynamicIcon({ type, name, size = 20, color = 'white' }: Props) {
  switch (type) {
    case 'feather':
      return <Feather name={name as never} size={size} color={color} />;
    case 'font-awesome-5':
      return <FontAwesome5 name={name as never} size={size} color={color} />;
    case 'material-community':
      return (
        <MaterialCommunityIcons
          name={name as never}
          size={size}
          color={color}
        />
      );
    case 'material-icons':
      return <MaterialIcons name={name as never} size={size} color={color} />;
    case 'ionicon':
      return <Ionicons name={name as never} size={size} color={color} />;
  }
}
