import Discover from '@app/components/Discover';
import Alert from '@app/components/Common/Alert';
import Button from '@app/components/Common/Button';
import Link from 'next/link';
import useSWR from 'swr';
import { useUser } from '@app/hooks/useUser';
import useSettings from '@app/hooks/useSettings';
import type { NextPage } from 'next';

const Index: NextPage = () => {
  const { user } = useUser();
  const settings = useSettings();

  // Récupérer les demandes de suppression
  const { data: deletionRequests } = useSWR(
    settings.currentSettings.enableDeletionRequests
      ? '/api/v1/deletion-request'
      : null
  );

  // Filtrer les demandes en attente (status 0) pour lesquelles l'utilisateur n'a PAS encore voté
  const pendingVotes = deletionRequests?.filter((req: any) =>
    req.status === 0 &&
    !req.votes.some((vote: any) => vote.user.id === user?.id)
  );

  return (
    <>
      {pendingVotes && pendingVotes.length > 0 && (
        <div className="mt-6 mb-4 px-4 sm:px-8">
          <Alert
            title="Deletion Requests Pending"
            type="warning"
          >
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-yellow-100">
                There are <strong>{pendingVotes.length}</strong> media deletion requests waiting for your vote.
              </p>
              <Link href="/deletion-requests">
                <a>
                  <Button buttonSize="sm" buttonType="default" className="text-gray-800 bg-white hover:bg-gray-200">
                    Review Requests
                  </Button>
                </a>
              </Link>
            </div>
          </Alert>
        </div>
      )}
      <Discover />
    </>
  );
};

export default Index;
