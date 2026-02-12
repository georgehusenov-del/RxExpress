import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Building2, Search, CheckCircle, XCircle, Eye,
  MoreVertical, MapPin, Phone, Mail, FileText
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { adminAPI } from '@/lib/api';
import { toast } from 'sonner';

export const PharmaciesManagement = () => {
  const [pharmacies, setPharmacies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPharmacy, setSelectedPharmacy] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  const fetchPharmacies = useCallback(async () => {
    try {
      setLoading(true);
      const response = await adminAPI.getPharmacies();
      setPharmacies(response.data.pharmacies || []);
    } catch (err) {
      console.error('Failed to fetch pharmacies:', err);
      toast.error('Failed to load pharmacies');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPharmacies();
  }, [fetchPharmacies]);

  const handleVerifyPharmacy = async (pharmacyId) => {
    try {
      await adminAPI.verifyPharmacy(pharmacyId);
      toast.success('Pharmacy verified successfully');
      fetchPharmacies();
    } catch (err) {
      toast.error('Failed to verify pharmacy');
    }
  };

  const filteredPharmacies = pharmacies.filter(pharmacy =>
    pharmacy.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    pharmacy.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    pharmacy.license_number?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-heading font-semibold text-white">Pharmacy Management</h3>
          <p className="text-sm text-slate-400">Manage registered pharmacies and verify new ones</p>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Search pharmacies..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 bg-slate-800 border-slate-700 text-white w-64"
            data-testid="search-pharmacies-input"
          />
        </div>
      </div>

      {/* Pharmacies Table */}
      <Card className="bg-slate-800 border-slate-700">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="border-slate-700 hover:bg-slate-700/50">
                <TableHead className="text-slate-400">Pharmacy</TableHead>
                <TableHead className="text-slate-400">License</TableHead>
                <TableHead className="text-slate-400">Contact</TableHead>
                <TableHead className="text-slate-400">Status</TableHead>
                <TableHead className="text-slate-400">Deliveries</TableHead>
                <TableHead className="text-slate-400 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-slate-500">
                    Loading pharmacies...
                  </TableCell>
                </TableRow>
              ) : filteredPharmacies.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-slate-500">
                    No pharmacies found
                  </TableCell>
                </TableRow>
              ) : (
                filteredPharmacies.map((pharmacy) => (
                  <TableRow
                    key={pharmacy.id}
                    className="border-slate-700 hover:bg-slate-700/50"
                    data-testid={`pharmacy-row-${pharmacy.id}`}
                  >
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-blue-600 flex items-center justify-center">
                          <Building2 className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <p className="font-medium text-white">{pharmacy.name}</p>
                          <p className="text-sm text-slate-400">{pharmacy.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-slate-300 font-mono text-sm">
                      {pharmacy.license_number || 'N/A'}
                    </TableCell>
                    <TableCell className="text-slate-400">
                      {pharmacy.phone || 'N/A'}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant="outline"
                          className={pharmacy.is_verified
                            ? 'bg-green-500/20 text-green-400 border-green-500/30'
                            : 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                          }
                        >
                          {pharmacy.is_verified ? 'Verified' : 'Pending'}
                        </Badge>
                        {pharmacy.is_active ? (
                          <Badge variant="outline" className="bg-green-500/20 text-green-400 border-green-500/30">
                            Active
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-red-500/20 text-red-400 border-red-500/30">
                            Inactive
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-slate-300">
                      {pharmacy.total_deliveries || 0}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="text-slate-400 hover:text-white">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-slate-800 border-slate-700">
                          <DropdownMenuItem
                            className="text-slate-300 hover:bg-slate-700"
                            onClick={() => {
                              setSelectedPharmacy(pharmacy);
                              setShowDetailsModal(true);
                            }}
                          >
                            <Eye className="w-4 h-4 mr-2" />
                            View Details
                          </DropdownMenuItem>
                          {!pharmacy.is_verified && (
                            <DropdownMenuItem
                              className="text-green-400 hover:bg-slate-700"
                              onClick={() => handleVerifyPharmacy(pharmacy.id)}
                            >
                              <CheckCircle className="w-4 h-4 mr-2" />
                              Verify Pharmacy
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Pharmacy Details Modal */}
      <Dialog open={showDetailsModal} onOpenChange={setShowDetailsModal}>
        <DialogContent className="bg-slate-800 border-slate-700 text-white max-w-lg">
          <DialogHeader>
            <DialogTitle>Pharmacy Details</DialogTitle>
          </DialogHeader>
          {selectedPharmacy && (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-xl bg-blue-600 flex items-center justify-center">
                  <Building2 className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">{selectedPharmacy.name}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="outline" className={selectedPharmacy.is_verified
                      ? 'bg-green-500/20 text-green-400 border-green-500/30'
                      : 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                    }>
                      {selectedPharmacy.is_verified ? 'Verified' : 'Pending Verification'}
                    </Badge>
                  </div>
                </div>
              </div>
              
              <div className="space-y-3 pt-4 border-t border-slate-700">
                <div className="flex items-center gap-3 text-slate-300">
                  <FileText className="w-4 h-4 text-slate-500" />
                  <span>License: {selectedPharmacy.license_number || 'Not provided'}</span>
                </div>
                <div className="flex items-center gap-3 text-slate-300">
                  <Mail className="w-4 h-4 text-slate-500" />
                  <span>{selectedPharmacy.email}</span>
                </div>
                <div className="flex items-center gap-3 text-slate-300">
                  <Phone className="w-4 h-4 text-slate-500" />
                  <span>{selectedPharmacy.phone || 'Not provided'}</span>
                </div>
                {selectedPharmacy.address && (
                  <div className="flex items-start gap-3 text-slate-300">
                    <MapPin className="w-4 h-4 text-slate-500 mt-0.5" />
                    <span>
                      {selectedPharmacy.address.street}, {selectedPharmacy.address.city}, {selectedPharmacy.address.state} {selectedPharmacy.address.postal_code}
                    </span>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-700">
                <div className="text-center p-3 bg-slate-700/50 rounded-lg">
                  <p className="text-2xl font-bold text-teal-400">{selectedPharmacy.total_deliveries || 0}</p>
                  <p className="text-xs text-slate-400">Total Deliveries</p>
                </div>
                <div className="text-center p-3 bg-slate-700/50 rounded-lg">
                  <p className="text-2xl font-bold text-amber-400">{selectedPharmacy.rating?.toFixed(1) || '0.0'}</p>
                  <p className="text-xs text-slate-400">Rating</p>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            {selectedPharmacy && !selectedPharmacy.is_verified && (
              <Button
                onClick={() => {
                  handleVerifyPharmacy(selectedPharmacy.id);
                  setShowDetailsModal(false);
                }}
                className="bg-green-600 hover:bg-green-700"
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Verify Pharmacy
              </Button>
            )}
            <Button variant="outline" onClick={() => setShowDetailsModal(false)} className="border-slate-600">
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PharmaciesManagement;
