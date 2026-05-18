import { useState } from 'react';

interface Props {
  name: string;
  tagline: string;
  description: string;
  location: string;
  phone: string;
  email: string;
  onChange: <K extends string>(key: K, value: string) => void;
}

export default function BusinessDetailsStep({
  name,
  tagline,
  description,
  location,
  phone,
  email,
  onChange,
}: Props) {
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = (field: string, value: string): string | null => {
    if (field === 'name' && value.trim().length < 2) return 'Name must be at least 2 characters';
    if (field === 'phone' && value && !/^[\d\s\-+()]{7,}$/.test(value)) return 'Invalid phone number';
    if (field === 'email' && value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return 'Invalid email address';
    return null;
  };

  const handleChange = (field: string, value: string) => {
    onChange(field as any, value);
    const err = validate(field, value);
    setErrors((prev) => {
      const next = { ...prev };
      if (err) next[field] = err;
      else delete next[field];
      return next;
    });
  };

  return (
    <div>
      <h2 className="text-xl font-bold mb-2">Tell us about your business</h2>
      <p className="text-gray-500 mb-6">
        Provide details so we can create a website that fits your brand.
      </p>

      <div className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Business Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => handleChange('name', e.target.value)}
            className="w-full border rounded-lg px-3 py-2"
            placeholder="Acme Corp"
          />
          {errors.name && (
            <p className="text-sm text-red-500 mt-1">{errors.name}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Tagline
          </label>
          <input
            type="text"
            value={tagline}
            onChange={(e) => handleChange('tagline', e.target.value)}
            className="w-full border rounded-lg px-3 py-2"
            placeholder="Building the future, one step at a time"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Description
          </label>
          <textarea
            value={description}
            onChange={(e) => handleChange('description', e.target.value)}
            className="w-full border rounded-lg px-3 py-2 h-24 resize-none"
            placeholder="Tell us what your business does..."
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Location
            </label>
            <input
              type="text"
              value={location}
              onChange={(e) => handleChange('location', e.target.value)}
              className="w-full border rounded-lg px-3 py-2"
              placeholder="New York, NY"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Phone
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => handleChange('phone', e.target.value)}
              className="w-full border rounded-lg px-3 py-2"
              placeholder="+1 (555) 123-4567"
            />
            {errors.phone && (
              <p className="text-sm text-red-500 mt-1">{errors.phone}</p>
            )}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Email
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => handleChange('email', e.target.value)}
            className="w-full border rounded-lg px-3 py-2"
            placeholder="hello@acme.com"
          />
          {errors.email && (
            <p className="text-sm text-red-500 mt-1">{errors.email}</p>
          )}
        </div>
      </div>
    </div>
  );
}
