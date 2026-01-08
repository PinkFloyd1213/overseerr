import Button from '@app/components/Common/Button';
import Tooltip from '@app/components/Common/Tooltip';
import { TrashIcon } from '@heroicons/react/24/outline';
import useSWR, { mutate } from 'swr';
import axios from 'axios';
import { useState } from 'react';
import { useUser, Permission } from '@app/hooks/useUser';
import useSettings from '@app/hooks/useSettings';

interface DeleteRequestButtonProps {
  mediaId: number;
}

const DeleteRequestButton = ({ mediaId }: DeleteRequestButtonProps) => {
  const settings = useSettings();
  const { user, hasPermission } = useUser();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canRequestDeletion =
    settings.currentSettings.enableDeletionRequests &&
    user &&
    hasPermission(Permission.REQUEST_DELETION);

  const { data: requests } = useSWR(
    canRequestDeletion ? '/api/v1/deletion-request' : null
  );

  if (!canRequestDeletion) {
    return null;
  }

  const activeRequest = requests?.find(
    (req: any) => req.media.id === mediaId && req.status === 0
  );

  const requestDeletion = async () => {
    setIsSubmitting(true);
    try {
      await axios.post(`/api/v1/media/${mediaId}/delete_request`);
      mutate('/api/v1/deletion-request');
    } catch (e) {
      console.error('Error requesting deletion', e);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (activeRequest) {
    return (
      <Tooltip content="Deletion request pending approval">
        <span className="ml-2 inline-block">
          <Button buttonType="danger" disabled>
            <TrashIcon />
          </Button>
        </span>
      </Tooltip>
    );
  }

  return (
    <Tooltip content="Request Removal from Server">
      <Button
        className="ml-2"
        buttonType="danger"
        onClick={requestDeletion}
        disabled={isSubmitting}
      >
        <TrashIcon />
      </Button>
    </Tooltip>
  );
};

export default DeleteRequestButton;
