import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar, Users, Plane, Edit, Save, X, Trash2 } from "lucide-react";

interface Segment {
  from: string;
  to: string;
  date: string;
  passengers: { adults: number; children: number; infants: number };
}

interface SegmentCardProps {
  segment: Segment;
  index: number;
  isEditing: boolean;
  onEdit: () => void;
  onSave: (updatedSegment: Segment) => void;
  onCancel: () => void;
  onDelete: () => void;
}

const SegmentCard = ({ segment, index, isEditing, onEdit, onSave, onCancel, onDelete }: SegmentCardProps) => {
  const [editedSegment, setEditedSegment] = useState(segment);

  const handleSave = () => {
    onSave(editedSegment);
  };

  const handleCancel = () => {
    setEditedSegment(segment);
    onCancel();
  };

  return (
    <div className="p-4 border rounded-lg bg-gradient-subtle">
      {!isEditing ? (
        <>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">{segment.date}</span>
            </div>
            <div className="flex items-center space-x-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">
                {segment.passengers.adults}A
                {segment.passengers.children > 0 && `, ${segment.passengers.children}C`}
                {segment.passengers.infants > 0 && `, ${segment.passengers.infants}I`}
              </span>
              <div className="flex gap-1 ml-4">
                <Button variant="ghost" size="sm" onClick={onEdit}>
                  <Edit className="h-3 w-3" />
                </Button>
                <Button variant="ghost" size="sm" onClick={onDelete} className="hover:text-destructive">
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <div className="text-lg font-bold text-primary">{segment.from}</div>
            <div className="flex items-center space-x-2">
              <div className="h-px bg-border flex-1 w-8"></div>
              <Plane className="h-4 w-4 text-muted-foreground" />
              <div className="h-px bg-border flex-1 w-8"></div>
            </div>
            <div className="text-lg font-bold text-accent">{segment.to}</div>
          </div>
        </>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>From</Label>
              <Input
                value={editedSegment.from}
                onChange={(e) => setEditedSegment({...editedSegment, from: e.target.value.toUpperCase()})}
                maxLength={3}
              />
            </div>
            <div>
              <Label>To</Label>
              <Input
                value={editedSegment.to}
                onChange={(e) => setEditedSegment({...editedSegment, to: e.target.value.toUpperCase()})}
                maxLength={3}
              />
            </div>
          </div>
          <div>
            <Label>Date</Label>
            <Input
              type="date"
              value={editedSegment.date}
              onChange={(e) => setEditedSegment({...editedSegment, date: e.target.value})}
            />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label>Adults</Label>
              <Input
                type="number"
                min="1"
                value={editedSegment.passengers.adults}
                onChange={(e) => setEditedSegment({
                  ...editedSegment, 
                  passengers: {...editedSegment.passengers, adults: parseInt(e.target.value) || 1}
                })}
              />
            </div>
            <div>
              <Label>Children</Label>
              <Input
                type="number"
                min="0"
                value={editedSegment.passengers.children}
                onChange={(e) => setEditedSegment({
                  ...editedSegment, 
                  passengers: {...editedSegment.passengers, children: parseInt(e.target.value) || 0}
                })}
              />
            </div>
            <div>
              <Label>Infants</Label>
              <Input
                type="number"
                min="0"
                value={editedSegment.passengers.infants}
                onChange={(e) => setEditedSegment({
                  ...editedSegment, 
                  passengers: {...editedSegment.passengers, infants: parseInt(e.target.value) || 0}
                })}
              />
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleSave} size="sm">
              <Save className="h-4 w-4 mr-2" />
              Save
            </Button>
            <Button variant="outline" onClick={handleCancel} size="sm">
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SegmentCard;