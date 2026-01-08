import Button from '@app/components/Common/Button';
import Tooltip from '@app/components/Common/Tooltip';
import useSettings from '@app/hooks/useSettings';
import { Permission, useUser } from '@app/hooks/useUser';
import { TrashIcon } from '@heroicons/react/24/outline';
import axios from 'axios';
import { useState } from 'react';
import useSWR, { mutate } from 'swr';

interface DeleteRequestButtonProps {
  mediaId: number;
  seasonNumber?: number;
}

const DeleteRequestButton = ({
  mediaId,
  seasonNumber,
}: DeleteRequestButtonProps) => {
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
    (req: any) =>
      req.media.id === mediaId &&
      req.status === 0 &&
      req.seasonNumber == seasonNumber
  );

  const requestDeletion = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    setIsSubmitting(true);
    try {
      await axios.post(`/api/v1/media/${mediaId}/delete_request`, {
        seasonNumber,
      });
      mutate('/api/v1/deletion-request');
    } catch (e) {
      console.error('Error requesting deletion', e);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isSeasonButton = seasonNumber !== undefined;

  if (activeRequest) {
    return (
      <Tooltip content="Deletion pending">
        <span className={`${isSeasonButton ? 'mr-2' : 'ml-2'} inline-block`}>
          <Button
            buttonType="danger"
            buttonSize={isSeasonButton ? 'sm' : 'md'}
            disabled
          >
            <TrashIcon className={isSeasonButton ? 'h-4 w-4' : 'h-5 w-5'} />
          </Button>
        </span>
      </Tooltip>
    );
  }

  return (
    <Tooltip
      content={`Request ${isSeasonButton ? 'Season' : 'Series'} Removal`}
    >
      <span className={`${isSeasonButton ? 'mr-2' : 'ml-2'} inline-block`}>
        <Button
          buttonType="danger"
          buttonSize={isSeasonButton ? 'sm' : 'md'}
          onClick={requestDeletion}
          disabled={isSubmitting}
        >
          <TrashIcon className={isSeasonButton ? 'h-4 w-4' : 'h-5 w-5'} />
        </Button>
      </span>
    </Tooltip>
  );
};

export default DeleteRequestButton;
