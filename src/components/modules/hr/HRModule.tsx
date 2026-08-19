import React, { useState, useEffect } from 'react';
import { Users, UserCog, Calendar, Plus, ShieldCheck, Edit, Trash2, AlertCircle } from 'lucide-react';
import { supabaseDataService } from '../../../services/supabaseDataService';
import { Employee, User, AttendanceRecord, PayrollRecord } from '../../../types';
import { PageHeader } from '../../common/PageHeader';
import { DataTable, Column } from '../../common/DataTable';
import { StatusBadge } from '../../common/StatusBadge';
import { Modal } from '../../common/Modal';
import { ConfirmationDialog } from '../../common/ConfirmationDialog';
import { ExportPrintToolbar } from '../../common/ExportPrintToolbar';
import { useAuth } from '../../../context/AuthContext';
import { useERP } from '../../../context/ERPContext';
import { PermissionGuard } from '../../common/PermissionGuard';
import { UserManagementModule } from './UserManagementModule';

export const HRModule: React.FC = () => {
  const { currentUser, canOperate, canDelete } = useAuth();
  const { activeModule } = useERP();
  const [employees, setEmployees] = useState<Employee[]>(supabaseDataService.getEmployees());
  const [users, setUsers] = useState<User[]>(supabaseDataService.getUsers());
  const [attendance, setAttendance] = useState<AttendanceRecord[]>(supabaseDataService.getAttendance());
  const [payroll, setPayroll] = useState<PayrollRecord[]>(supabaseDataService.getPayroll());
  const [activeTab, setActiveTab] = useState<'employees' | 'users' | 'payroll'>(
    activeModule === 'hr_users' ? 'users' : activeModule === 'hr_payroll' ? 'payroll' : 'employees'
  );

  useEffect(() => {
    if (activeModule === 'hr_users') {
      setActiveTab('users');
    } else if (activeModule === 'hr_payroll') {
      setActiveTab('payroll');
    } else if (activeModule === 'hr_employees') {
      setActiveTab('employees');
    }
  }, [activeModule]);

  const [isEmpModalOpen, setIsEmpModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedEmp, setSelectedEmp] = useState<Employee | null>(null);
  const [empToDelete, setEmpToDelete] = useState<Employee | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Emp Form
  const [empName, setEmpName] = useState('');
  const [empId, setEmpId] = useState('');
  const [designation, setDesignation] = useState('');
  const [department, setDepartment] = useState<any>('Sewing');
  const [basicSalary, setBasicSalary] = useState<number | ''>('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');

  useEffect(() => {
    setEmployees(supabaseDataService.getEmployees());
    setUsers(supabaseDataService.getUsers());
    setAttendance(supabaseDataService.getAttendance());
    setPayroll(supabaseDataService.getPayroll());

    const unsub = supabaseDataService.subscribe(() => {
      setEmployees([...supabaseDataService.getEmployees()]);
      setUsers([...supabaseDataService.getUsers()]);
      setAttendance([...supabaseDataService.getAttendance()]);
      setPayroll([...supabaseDataService.getPayroll()]);
    });
    return unsub;
  }, []);

  const resetForm = () => {
    setSelectedEmp(null);
    setEmpName('');
    setEmpId('');
    setDesignation('');
    setDepartment('Sewing');
    setBasicSalary('');
    setPhone('');
    setEmail('');
    setErrorMessage(null);
  };

  const handleOpenAdd = () => {
    resetForm();
    setIsEmpModalOpen(true);
  };

  const handleOpenEdit = (emp: Employee) => {
    setSelectedEmp(emp);
    setEmpId(emp.empId);
    setEmpName(emp.name);
    setDesignation(emp.designation);
    setDepartment(emp.department);
    setBasicSalary(emp.basicSalary);
    setPhone(emp.phone || '');
    setEmail(emp.email || '');
    setErrorMessage(null);
    setIsEmpModalOpen(true);
  };

  const handleOpenDelete = (emp: Employee) => {
    setEmpToDelete(emp);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!empToDelete) return;
    setIsLoading(true);
    const res = await supabaseDataService.deleteEmployee(empToDelete.id, currentUser?.name);
    setIsLoading(false);

    if (!res.success) {
      setErrorMessage(res.error || 'Failed to delete employee from database.');
    } else {
      setIsDeleteModalOpen(false);
      setEmpToDelete(null);
    }
  };

  const handleSaveEmp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!empId || !empName || !designation || basicSalary === '') {
      setErrorMessage('Please fill in Employee ID, Name, Designation, and Basic Salary.');
      return;
    }

    setErrorMessage(null);
    setIsLoading(true);

    const emp: Employee = {
      id: selectedEmp ? selectedEmp.id : 'emp-' + Date.now(),
      empId,
      name: empName,
      designation,
      department,
      section: selectedEmp ? selectedEmp.section : 'Floor Ops',
      shift: selectedEmp ? selectedEmp.shift : 'Day',
      joiningDate: selectedEmp ? selectedEmp.joiningDate : new Date().toISOString().substring(0, 10),
      phone: phone || '+8801700000000',
      email: email || undefined,
      basicSalary: Number(basicSalary),
      otRatePerHour: Math.round(Number(basicSalary) / 208 * 1.5) || 150,
      status: selectedEmp ? selectedEmp.status : 'Active'
    };

    const res = await supabaseDataService.saveEmployee(emp, currentUser?.name);
    setIsLoading(false);

    if (!res.success) {
      setErrorMessage(res.error || 'Failed to save employee to Supabase.');
    } else {
      setIsEmpModalOpen(false);
      resetForm();
    }
  };

  const empColumns: Column<Employee>[] = [
    { header: 'Emp ID', accessorKey: 'empId', sortable: true, cell: e => <span className="font-bold text-blue-600">{e.empId}</span> },
    { header: 'Name', accessorKey: 'name', sortable: true, cell: e => <span className="font-bold text-slate-800">{e.name}</span> },
    { header: 'Designation', accessorKey: 'designation' },
    { header: 'Department', accessorKey: 'department', sortable: true },
    { header: 'Basic Salary', cell: e => <span className="font-bold text-slate-900">৳{(e.basicSalary || 0).toLocaleString()}</span> },
    { header: 'Status', accessorKey: 'status', cell: e => <StatusBadge status={e.status} /> },
    {
      header: 'Actions',
      cell: e => (
        <div className="flex items-center gap-1">
          {canOperate('HR & Admin') && (
            <button
              onClick={() => handleOpenEdit(e)}
              className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600 hover:text-blue-600 transition-colors"
              title="Edit Employee"
            >
              <Edit className="h-3.5 w-3.5" />
            </button>
          )}
          {canDelete('HR & Admin') && (
            <button
              onClick={() => handleOpenDelete(e)}
              className="p-1.5 rounded-lg hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-colors"
              title="Delete Employee"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      )
    }
  ];

  const userColumns: Column<User>[] = [
    { header: 'Username / Email', cell: u => <div><span className="font-bold text-slate-900">{u.username}</span> <p className="text-[11px] text-slate-500">{u.email}</p></div> },
    { header: 'Full Name', accessorKey: 'name', sortable: true },
    { header: 'Role', accessorKey: 'role', sortable: true, cell: u => <span className="font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">{u.role}</span> },
    { header: 'Assigned Dept', accessorKey: 'department' },
    { header: 'Status', accessorKey: 'status', cell: u => <StatusBadge status={u.status} /> }
  ];

  const payrollColumns: Column<PayrollRecord>[] = [
    { header: 'Month', accessorKey: 'month', sortable: true },
    { header: 'Emp ID / Name', cell: p => <div><span className="font-bold text-slate-800">{p.empName}</span> <p className="text-[11px] text-slate-500">{p.empId}</p></div> },
    { header: 'Basic Salary', cell: p => <span>৳{(p.basicSalary || 0).toLocaleString()}</span> },
    { header: 'OT Hours & Amount', cell: p => <span>{p.otHours} hrs (৳{(p.otAmount || 0).toLocaleString()})</span> },
    { header: 'Net Payable', cell: p => <span className="font-black text-emerald-700">৳{(p.netSalary || 0).toLocaleString()}</span> },
    { header: 'Status', accessorKey: 'status', cell: p => <StatusBadge status={p.status} /> }
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="HR & User Access Administration"
        description="Employee Directory, Role-based Access Controls, Attendance & Payroll Calculations"
        actions={
          <div className="flex items-center gap-2">
            <ExportPrintToolbar title="Employee List" data={employees} filename="MJAL_HR_Employees" />
            <PermissionGuard department="HR & Admin">
              <button
                onClick={handleOpenAdd}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl bg-blue-600 text-white hover:bg-blue-700 shadow-sm"
              >
                <Plus className="h-4 w-4" />
                Add Employee
              </button>
            </PermissionGuard>
          </div>
        }
      />

      <div className="flex border-b border-slate-200 gap-4 text-xs font-bold">
        <button
          onClick={() => setActiveTab('employees')}
          className={`pb-2.5 transition-colors border-b-2 ${activeTab === 'employees' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500'}`}
        >
          Employee Directory
        </button>
        <button
          onClick={() => setActiveTab('users')}
          className={`pb-2.5 transition-colors border-b-2 ${activeTab === 'users' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500'}`}
        >
          Users & Permission Matrix
        </button>
        <button
          onClick={() => setActiveTab('payroll')}
          className={`pb-2.5 transition-colors border-b-2 ${activeTab === 'payroll' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500'}`}
        >
          Payroll & Attendance
        </button>
      </div>

      {activeTab === 'employees' && <DataTable data={employees} columns={empColumns} keyExtractor={e => e.id} searchPlaceholder="Search employees..." />}
      {activeTab === 'users' && (
        currentUser?.role === 'SUPER_ADMIN' ? (
          <UserManagementModule />
        ) : (
          <DataTable data={users} columns={userColumns} keyExtractor={u => u.id} searchPlaceholder="Search user permissions..." />
        )
      )}
      {activeTab === 'payroll' && <DataTable data={payroll} columns={payrollColumns} keyExtractor={p => p.id} searchPlaceholder="Search payroll records..." />}

      {/* Employee Modal */}
      <Modal
        isOpen={isEmpModalOpen}
        onClose={() => { setIsEmpModalOpen(false); resetForm(); }}
        title={selectedEmp ? 'Edit Employee Details' : 'New Employee Enrollment'}
      >
        <form onSubmit={handleSaveEmp} className="space-y-4">
          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2 font-medium">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Emp ID *</label>
              <input
                type="text"
                placeholder="Enter Employee ID (e.g. MJAL-030)"
                value={empId}
                onChange={e => setEmpId(e.target.value)}
                className="w-full rounded border p-2 text-xs font-bold"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Full Name *</label>
              <input
                type="text"
                placeholder="Enter Full Name"
                value={empName}
                onChange={e => setEmpName(e.target.value)}
                className="w-full rounded border p-2 text-xs font-bold"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Designation *</label>
              <input
                type="text"
                placeholder="Enter Designation (e.g. Senior Operator)"
                value={designation}
                onChange={e => setDesignation(e.target.value)}
                className="w-full rounded border p-2 text-xs font-bold"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Department *</label>
              <select value={department} onChange={e => setDepartment(e.target.value)} className="w-full rounded border p-2 text-xs font-bold">
                <option value="Sewing">Sewing</option>
                <option value="Cutting">Cutting</option>
                <option value="Finishing">Finishing</option>
                <option value="QC">QC</option>
                <option value="Store">Store</option>
                <option value="Sample">Sample</option>
                <option value="Shipment">Shipment</option>
                <option value="Merchandising">Merchandising</option>
                <option value="HR & Admin">HR & Admin</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Basic Salary (BDT) *</label>
              <input
                type="number"
                placeholder="Enter Basic Salary"
                value={basicSalary}
                onChange={e => setBasicSalary(e.target.value === '' ? '' : Number(e.target.value))}
                className="w-full rounded border p-2 text-xs font-bold text-emerald-700"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Phone Number</label>
              <input
                type="text"
                placeholder="e.g. +8801700000000"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                className="w-full rounded border p-2 text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Email</label>
              <input
                type="email"
                placeholder="e.g. emp@mjal.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full rounded border p-2 text-xs"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => { setIsEmpModalOpen(false); resetForm(); }}
              className="px-4 py-2 text-xs rounded border border-slate-200 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-5 py-2 text-xs font-bold rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {isLoading ? 'Saving...' : selectedEmp ? 'Update Employee' : 'Save Employee'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={isDeleteModalOpen}
        title="Confirm Deletion"
        message={`Are you sure you want to permanently delete employee "${empToDelete?.name}" (${empToDelete?.empId})?`}
        confirmLabel={isLoading ? 'Deleting...' : 'Delete Employee'}
        variant="danger"
        onConfirm={handleConfirmDelete}
        onCancel={() => { setIsDeleteModalOpen(false); setEmpToDelete(null); }}
      />
    </div>
  );
};
