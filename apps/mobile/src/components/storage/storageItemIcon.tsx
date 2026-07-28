
import { FileText, Folder, Image as ImageIcon, Video as VideoIcon } from 'lucide-react-native';
import { StorageItem } from '../../stores/storageStore';

// Icon Render for files
export function renderItemIcon(item: StorageItem, size = 20) {
  if (item.type === 'folder') {
    return <Folder size={size} color="#7C3AED" fill="#E8D5FF" />;
  }
  if (item.type === 'pdf') {
    return <FileText size={size} color="#EF4444" />;
  }
  if (item.type === 'image') {
    return <ImageIcon size={size} color="#10B981" />;
  }
  if (item.type === 'video') {
    return <VideoIcon size={size} color="#3B82F6" />;
  }
  return <FileText size={size} color="#6B7280" />;
}
