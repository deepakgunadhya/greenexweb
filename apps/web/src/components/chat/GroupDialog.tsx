import { useState } from 'react';
import { chatApi, Group } from '@/lib/api/chat';
import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

interface GroupDialogProps {
  open?: boolean;
  isOpen?: boolean;
  onClose: () => void;
  onSuccess: () => void;
  group?: Group | null;
}

export function GroupDialog({ open, isOpen, onClose, onSuccess, group }: GroupDialogProps) {
  const dialogOpen = isOpen !== undefined ? isOpen : open !== undefined ? open : false;
  const [name, setName] = useState(group?.name || '');
  const [description, setDescription] = useState(group?.description || '');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !description.trim()) {
      toast.error('Please fill in all fields');
      return;
    }

    try {
      setIsLoading(true);
      if (group) {
        await chatApi.updateGroup(group.id, { name, description });
        toast.success('Group updated successfully');
      } else {
        await chatApi.createGroup({ name, description });
        toast.success('Group created successfully');
      }
      onSuccess();
      onClose();
      setName('');
      setDescription('');
    } catch (error: any) {
      console.error('Failed to save group:', error);
      toast.error(error.message || 'Failed to save group');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog isOpen={dialogOpen} onClose={onClose}>
      <div className="p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          {group ? 'Edit Group' : 'Create New Group'}
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
              Group Name
            </label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter group name"
              required
              maxLength={50}
            />
          </div>
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter group description"
              required
              rows={4}
              maxLength={500}
            />
          </div>
          <div className="flex justify-end space-x-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading || !name.trim() || !description.trim()}
              className="bg-primary-600 hover:bg-primary-700"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {group ? 'Updating...' : 'Creating...'}
                </>
              ) : (
                group ? 'Update' : 'Create'
              )}
            </Button>
          </div>
        </form>
      </div>
    </Dialog>
  );
}

