import { clsx } from 'clsx';
import { getInitials, getAvatarColor } from '../../utils/formatters';

const sizes = {
  xs: 'w-6 h-6 text-xs',
  sm: 'w-8 h-8 text-sm',
  md: 'w-10 h-10 text-sm',
  lg: 'w-12 h-12 text-base',
  xl: 'w-16 h-16 text-lg',
};

export function Avatar({ name, color, size = 'md', className, src }) {
  const backgroundColor = color || getAvatarColor(name);
  const initials = getInitials(name);
  const sizeClass = sizes[size];

  if (src) {
    return (
      <img
        src={src}
        alt={name}
        title={name}
        className={clsx('rounded-full object-cover', sizeClass, className)}
      />
    );
  }

  return (
    <div
      className={clsx(
        'inline-flex items-center justify-center rounded-full font-medium text-white',
        sizeClass,
        className
      )}
      style={{ backgroundColor }}
      title={name}
    >
      {initials}
    </div>
  );
}

export function AvatarGroup({ members, max = 4, size = 'sm' }) {
  const displayed = members.slice(0, max);
  const remaining = members.length - max;

  return (
    <div className="flex -space-x-2">
      {displayed.map((member) => (
        <Avatar
          key={member.id}
          name={member.name}
          color={member.avatarColor}
          src={member.avatarUrl}
          size={size}
          className="ring-2 ring-white"
        />
      ))}
      {remaining > 0 && (
        <div
          className={clsx(
            'inline-flex items-center justify-center rounded-full bg-gray-200 text-gray-600 font-medium ring-2 ring-white',
            sizes[size]
          )}
        >
          +{remaining}
        </div>
      )}
    </div>
  );
}
