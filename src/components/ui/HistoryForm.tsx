import { useState } from 'react';
import { Button } from './Button';
import { Input } from './Input';
import { Textarea } from './Textarea';

interface BaseHistoryItem {
  id: string;
  startDate: string;
  endDate: string;
}

export interface EmploymentHistoryItem extends BaseHistoryItem {
  company: string;
  position: string;
  description?: string;
}

export interface EducationHistoryItem extends BaseHistoryItem {
  school: string;
  degree: string;
  field: string;
}

export interface CertificationItem extends BaseHistoryItem {
  name: string;
  issuer: string;
  expiryDate?: string;
}

type HistoryType = 'employment' | 'education' | 'certification';

interface HistoryFormProps {
  type: HistoryType;
  items: (EmploymentHistoryItem | EducationHistoryItem | CertificationItem)[];
  onChange: (items: (EmploymentHistoryItem | EducationHistoryItem | CertificationItem)[]) => void;
  translations: {
    title: string;
    add: string;
    fields: Record<string, string>;
  };
}

export function HistoryForm({
  type,
  items,
  onChange,
  translations,
}: HistoryFormProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [editingItem, setEditingItem] = useState<Partial<EmploymentHistoryItem | EducationHistoryItem | CertificationItem>>({});

  const generateId = () => Math.random().toString(36).substr(2, 9);

  const handleChange = (field: string, value: string) => {
    setEditingItem((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    const newItem = { ...editingItem, id: editingItem.id || generateId() };
    
    if (editingItem.id) {
      // Edit existing item
      onChange(items.map((item) => (item.id === editingItem.id ? newItem : item)));
    } else {
      // Add new item
      onChange([...items, newItem]);
    }
    setIsAdding(false);
    setEditingItem({});
  };

  const handleEdit = (item: EmploymentHistoryItem | EducationHistoryItem | CertificationItem) => {
    setEditingItem(item);
    setIsAdding(true);
  };

  const handleDelete = (id: string) => {
    onChange(items.filter((item) => item.id !== id));
  };

  const renderForm = () => {
    switch (type) {
      case 'employment':
        return (
          <div className="space-y-4">
            <Input
              label={translations.fields.company}
              value={editingItem.company || ''}
              onChange={(e) => handleChange('company', e.target.value)}
              required
            />
            <Input
              label={translations.fields.position}
              value={editingItem.position || ''}
              onChange={(e) => handleChange('position', e.target.value)}
              required
            />
            <div className="grid grid-cols-2 gap-4">
              <Input
                label={translations.fields.startDate}
                type="date"
                value={editingItem.startDate || ''}
                onChange={(e) => handleChange('startDate', e.target.value)}
                required
              />
              <Input
                label={translations.fields.endDate}
                type="date"
                value={editingItem.endDate || ''}
                onChange={(e) => handleChange('endDate', e.target.value)}
                required
              />
            </div>
            <Textarea
              label={translations.fields.description}
              value={(editingItem as EmploymentHistoryItem)?.description || ''}
              onChange={(e) => handleChange('description', e.target.value)}
            />
          </div>
        );
      case 'education':
        return (
          <div className="space-y-4">
            <Input
              label={translations.fields.school}
              value={(editingItem as EducationHistoryItem)?.school || ''}
              onChange={(e) => handleChange('school', e.target.value)}
              required
            />
            <Input
              label={translations.fields.degree}
              value={(editingItem as EducationHistoryItem)?.degree || ''}
              onChange={(e) => handleChange('degree', e.target.value)}
              required
            />
            <Input
              label={translations.fields.field}
              value={(editingItem as EducationHistoryItem)?.field || ''}
              onChange={(e) => handleChange('field', e.target.value)}
              required
            />
            <div className="grid grid-cols-2 gap-4">
              <Input
                label={translations.fields.startDate}
                type="date"
                value={editingItem.startDate || ''}
                onChange={(e) => handleChange('startDate', e.target.value)}
                required
              />
              <Input
                label={translations.fields.endDate}
                type="date"
                value={editingItem.endDate || ''}
                onChange={(e) => handleChange('endDate', e.target.value)}
                required
              />
            </div>
          </div>
        );
      case 'certification':
        return (
          <div className="space-y-4">
            <Input
              label={translations.fields.name}
              value={(editingItem as CertificationItem)?.name || ''}
              onChange={(e) => handleChange('name', e.target.value)}
              required
            />
            <Input
              label={translations.fields.issuer}
              value={(editingItem as CertificationItem)?.issuer || ''}
              onChange={(e) => handleChange('issuer', e.target.value)}
              required
            />
            <div className="grid grid-cols-2 gap-4">
              <Input
                label={translations.fields.issueDate}
                type="date"
                value={editingItem.startDate || ''}
                onChange={(e) => handleChange('startDate', e.target.value)}
                required
              />
              <Input
                label={translations.fields.expiryDate}
                type="date"
                value={(editingItem as CertificationItem)?.expiryDate || ''}
                onChange={(e) => handleChange('expiryDate', e.target.value)}
              />
            </div>
          </div>
        );
    }
  };

  return (
    <div className="space-y-4">
      {isAdding ? (
        <div className="bg-gray-50 p-4 rounded-lg space-y-4">
          {renderForm()}
          <div className="flex justify-end space-x-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsAdding(false);
                setEditingItem({});
              }}
            >
              Cancel
            </Button>
            <Button type="button" onClick={handleSave}>
              Save
            </Button>
          </div>
        </div>
      ) : (
        <Button type="button" variant="outline" onClick={() => setIsAdding(true)}>
          + {translations.add}
        </Button>
      )}

      <div className="space-y-4">
        {items.map((item) => (
          <div
            key={item.id}
            className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm"
          >
            {type === 'employment' && (
              <>
                <h4 className="font-medium">{(item as EmploymentHistoryItem).position}</h4>
                <p className="text-gray-600">{(item as EmploymentHistoryItem).company}</p>
              </>
            )}
            {type === 'education' && (
              <>
                <h4 className="font-medium">{(item as EducationHistoryItem).degree}</h4>
                <p className="text-gray-600">{(item as EducationHistoryItem).school}</p>
              </>
            )}
            {type === 'certification' && (
              <>
                <h4 className="font-medium">{(item as CertificationItem).name}</h4>
                <p className="text-gray-600">{(item as CertificationItem).issuer}</p>
              </>
            )}
            <p className="text-sm text-gray-500">
              {new Date(item.startDate).toLocaleDateString()} -{' '}
              {new Date(item.endDate).toLocaleDateString()}
            </p>
            <div className="mt-2 flex justify-end space-x-2">
              <Button type="button" variant="outline" size="sm" onClick={() => handleEdit(item)}>
                Edit
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="text-red-600 hover:text-red-700"
                onClick={() => handleDelete(item.id)}
              >
                Delete
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
} 