import { TestBed } from '@angular/core/testing';
import { of,throwError } from 'rxjs';
import { vi } from 'vitest';
import { CollectionList } from './collection-list';
import { CollectionApi,CollectionDto } from './collection-api';
import { AuthService } from '../../../core/auth/auth.service';
const existing:CollectionDto={id:'1',version:1,name:'Bộ A',slug:'bo-a',sortOrder:0,active:true,createdAt:'',updatedAt:''};
describe('Collection management',()=>{
 function setup(role='OWNER'){const create=vi.fn(()=>of(existing)),update=vi.fn(()=>of({...existing,version:2,active:false}));TestBed.configureTestingModule({providers:[{provide:CollectionApi,useValue:{list:()=>of([existing]),create,update}},{provide:AuthService,useValue:{user:()=>({role})}}]});const f=TestBed.createComponent(CollectionList);return {c:f.componentInstance,create,update};}
 it('ownerCanCreateAndDeactivate and slugImmutableAfterCreate',()=>{const {c,create,update}=setup();c.form.setValue({name:'Bộ A',slug:'bo-a',sortOrder:0,active:true});c.save();expect(create).toHaveBeenCalledTimes(1);c.form.controls.active.setValue(false);c.save();expect(update).toHaveBeenCalledWith('1',1,{name:'Bộ A',sortOrder:0,active:false});expect(c.editing()?.slug).toBe('bo-a');});
 it('staleCollectionEditKeepsForm',()=>{const {c,update}=setup();c.edit(existing);c.form.controls.name.setValue('Tên mới');c.form.markAsDirty();update.mockReturnValue(throwError(()=>({status:409})));c.save();expect(c.form.controls.name.value).toBe('Tên mới');expect(c.form.dirty).toBe(true);});
 it('staffCannotMutate',()=>{const {c,create,update}=setup('STAFF');c.form.setValue({name:'A',slug:'a',sortOrder:0,active:true});c.save();expect(create).not.toHaveBeenCalled();expect(update).not.toHaveBeenCalled();});
});
