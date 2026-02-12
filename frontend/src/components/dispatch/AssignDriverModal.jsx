import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  User,
  Truck,
  MapPin,
  CheckCircle,
  Star
} from 'lucide-react';

const statusConfig = {
  available: { label: 'Available', color: 'bg-green-500' },
  on_route: { label: 'On Route', color: 'bg-blue-500' },
  on_break: { label: 'On Break', color: 'bg-amber-500' },
  offline: { label: 'Offline', color: 'bg-slate-400' },
};

export const AssignDriverModal = ({ order, drivers, onAssign, onClose }) => {
  const availableDrivers = drivers.filter(d => d.status === 'available');

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-heading flex items-center gap-2">
            <Truck className="w-5 h-5 text-teal-600" />
            Assign Driver
          </DialogTitle>
          <DialogDescription>
            Select an available driver for order <span className="font-mono font-medium">{order.order_number}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4">
          {/* Delivery Info */}
          <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-lg mb-4">
            <MapPin className="w-4 h-4 text-slate-500" />
            <span className="text-sm text-slate-700">
              {order.delivery_address?.street}, {order.delivery_address?.city}
            </span>
          </div>

          {/* Driver List */}
          <ScrollArea className="h-64">
            {availableDrivers.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                <User className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="font-medium">No available drivers</p>
                <p className="text-sm">All drivers are currently busy</p>
              </div>
            ) : (
              <div className="space-y-2 pr-2">
                {availableDrivers.map((driver) => {
                  const status = statusConfig[driver.status] || statusConfig.offline;

                  return (
                    <div
                      key={driver.id}
                      className="flex items-center gap-3 p-3 border border-slate-200 rounded-lg hover:border-teal-300 hover:bg-teal-50/50 cursor-pointer transition-all group"
                      onClick={() => onAssign(driver.id)}
                      data-testid={`driver-option-${driver.id}`}
                    >
                      <div className="relative">
                        <div className="w-12 h-12 rounded-full bg-slate-200 flex items-center justify-center">
                          <User className="w-6 h-6 text-slate-500" />
                        </div>
                        <div className={`absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full ${status.color} ring-2 ring-white flex items-center justify-center`}>
                          {driver.status === 'available' && (
                            <CheckCircle className="w-3 h-3 text-white" />
                          )}
                        </div>
                      </div>

                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-slate-900">{driver.vehicle_type}</p>
                          <Badge variant="outline" className="text-xs">
                            {driver.vehicle_number}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-xs text-slate-500">
                            {driver.total_deliveries || 0} deliveries
                          </span>
                          {driver.rating > 0 && (
                            <span className="text-xs text-amber-600 flex items-center gap-0.5">
                              <Star className="w-3 h-3 fill-amber-500" />
                              {driver.rating.toFixed(1)}
                            </span>
                          )}
                        </div>
                      </div>

                      <Button
                        size="sm"
                        className="opacity-0 group-hover:opacity-100 transition-opacity bg-teal-600 hover:bg-teal-700"
                        onClick={(e) => {
                          e.stopPropagation();
                          onAssign(driver.id);
                        }}
                      >
                        Assign
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </ScrollArea>

          {/* Cancel Button */}
          <div className="mt-4 pt-4 border-t">
            <Button variant="outline" className="w-full" onClick={onClose}>
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AssignDriverModal;
