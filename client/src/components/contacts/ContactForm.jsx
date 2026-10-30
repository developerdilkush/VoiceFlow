import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Input, Select, Textarea } from '../common/Field.jsx';
import { Button } from '../common/Button.jsx';
import { Modal } from '../common/Modal.jsx';
import { CONSENT_SOURCES } from '../../utils/format.js';

const schema = z.object({
  name: z.string().trim().max(80, 'Max 80 characters'),
  phone: z.string().trim().min(5, 'Enter a phone number').max(25),
  language: z.enum(['hi', 'en']),
  consentStatus: z.enum(['confirmed', 'unknown', 'revoked']),
  consentSource: z.string().optional(),
  notes: z.string().max(500, 'Max 500 characters'),
});

export function ContactForm({ open, contact, onClose, onSubmit }) {
  const edit = !!contact;
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(schema),
    values: { name: contact?.name || '', phone: '', language: contact?.language || 'en', consentStatus: contact?.consent?.status || 'unknown', consentSource: contact?.consent?.source || 'verbal', notes: contact?.notes || '' },
  });
  return (
    <Modal open={open} onClose={onClose} title={edit ? 'Edit contact' : 'Add contact'}
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button type="submit" form="contact-form" loading={isSubmitting}>Save</Button></>}>
      <form id="contact-form" noValidate onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input label="Name" error={errors.name?.message} {...register('name')} />
        <Input label={edit ? `Phone number (leave blank to keep ${contact.phoneMasked})` : 'Phone number'} type="tel" inputMode="tel" error={edit ? undefined : errors.phone?.message} {...register('phone', { required: !edit })} />
        <Select label="Preferred language" {...register('language')}><option value="en">English</option><option value="hi">Hindi</option></Select>
        <div className="grid sm:grid-cols-2 gap-4">
          <Select label="Consent status" {...register('consentStatus')}><option value="unknown">Unknown</option><option value="confirmed">Confirmed</option><option value="revoked">Revoked</option></Select>
          <Select label="Consent source" {...register('consentSource')}>{CONSENT_SOURCES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}</Select>
        </div>
        <Textarea label="Notes" className="!min-h-[80px]" error={errors.notes?.message} {...register('notes')} />
      </form>
    </Modal>
  );
}
