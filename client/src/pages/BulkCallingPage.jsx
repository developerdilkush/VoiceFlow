import { useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { PageHeader } from '../components/common/PageHeader.jsx';
import { ProviderBanner } from '../components/common/ProviderBanner.jsx';
import { ImportStep } from '../components/bulk/ImportStep.jsx';
import { JobProgress } from '../components/bulk/JobProgress.jsx';
import { useAsync } from '../hooks/useAsync.js';
import { bulkApi, settingsApi } from '../services/index.js';
import { errorMessage } from '../services/api.js';

export default function BulkCallingPage() {
  const provider = useAsync(settingsApi.provider);
  const key = useRef(crypto.randomUUID());
  const [jobId, setJobId] = useState(null);

  const start = async (result) => {
    if (!result.recipients.length) {
      toast.error('No valid phone numbers found.');
      return;
    }
    try {
      const job = await bulkApi.createJob({ recipients: result.recipients }, key.current);
      key.current = crypto.randomUUID();
      setJobId(job.data.id);
      toast.success(`Bulk calling started for ${job.data.total} numbers`);
    } catch (error) { toast.error(errorMessage(error)); }
  };

  return (
    <>
      <PageHeader title="Bulk calling" subtitle="Upload numbers or paste them—calls start with your default Settings." />
      <ProviderBanner simulated={provider.data?.data.simulated} />
      {jobId ? <JobProgress jobId={jobId} onDone={() => setJobId(null)} /> : <ImportStep onResult={start} />}
    </>
  );
}
