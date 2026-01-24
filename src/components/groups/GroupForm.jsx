import { useState } from 'react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { validateGroupName } from '../../utils/validators';

export function GroupForm({ onSubmit, onCancel, initialData = null }) {
  const [name, setName] = useState(initialData?.name || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [errors, setErrors] = useState({});

  const handleSubmit = (e) => {
    e.preventDefault();

    const newErrors = {};

    const nameError = validateGroupName(name);
    if (nameError) newErrors.name = nameError;

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    onSubmit({
      name: name.trim(),
      description: description.trim(),
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Input
        label="Group Name"
        placeholder="e.g., Trip to Paris, Roommates"
        value={name}
        onChange={(e) => {
          setName(e.target.value);
          setErrors({ ...errors, name: null });
        }}
        error={errors.name}
        autoFocus
      />

      <Input
        label="Description (optional)"
        placeholder="What is this group for?"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
      />

      <div className="flex gap-3 pt-2">
        {onCancel && (
          <Button type="button" variant="secondary" onClick={onCancel} className="flex-1">
            Cancel
          </Button>
        )}
        <Button type="submit" className="flex-1">
          {initialData ? 'Save Changes' : 'Create Group'}
        </Button>
      </div>
    </form>
  );
}
