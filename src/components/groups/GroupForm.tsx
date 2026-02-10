import { useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { validateGroupName } from '../../utils/validators';

type GroupFormData = {
  name: string;
  description: string;
};

type GroupFormProps = {
  onSubmit: (data: GroupFormData) => Promise<void> | void;
  onCancel?: () => void;
  initialData?: Partial<GroupFormData> | null;
};

export function GroupForm({ onSubmit, onCancel, initialData = null }: GroupFormProps) {
  const [name, setName] = useState(initialData?.name || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [errors, setErrors] = useState<Record<string, string | null>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isSubmitting) return;

    const newErrors: Record<string, string> = {};

    const nameError = validateGroupName(name);
    if (nameError) newErrors.name = nameError;

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit({
        name: name.trim(),
        description: description.trim(),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Input
        label="Group Name"
        placeholder="e.g., Trip to Paris, Roommates"
        value={name}
        onChange={(e: ChangeEvent<HTMLInputElement>) => {
          setName(e.target.value);
          setErrors({ ...errors, name: null });
        }}
        error={errors.name}
        autoFocus
        disabled={isSubmitting}
      />

      <Input
        label="Description (optional)"
        placeholder="What is this group for?"
        value={description}
        onChange={(e: ChangeEvent<HTMLInputElement>) => setDescription(e.target.value)}
        disabled={isSubmitting}
      />

      <div className="flex gap-3 pt-2">
        {onCancel && (
          <Button
            type="button"
            variant="secondary"
            onClick={onCancel}
            className="flex-1"
            disabled={isSubmitting}
          >
            Cancel
          </Button>
        )}
        <Button type="submit" className="flex-1" disabled={isSubmitting}>
          {isSubmitting ? 'Saving...' : initialData ? 'Save Changes' : 'Create Group'}
        </Button>
      </div>
    </form>
  );
}
