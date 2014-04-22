# vim: tabstop=4 shiftwidth=4 softtabstop=4

# Copyright 2012 United States Government as represented by the
# Administrator of the National Aeronautics and Space Administration.
# All Rights Reserved.
#
# Copyright 2012 Nebula, Inc.
#
#    Licensed under the Apache License, Version 2.0 (the "License"); you may
#    not use this file except in compliance with the License. You may obtain
#    a copy of the License at
#
#         http://www.apache.org/licenses/LICENSE-2.0
#
#    Unless required by applicable law or agreed to in writing, software
#    distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
#    WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the
#    License for the specific language governing permissions and limitations
#    under the License.

from django.core.urlresolvers import reverse
from django.core.urlresolvers import reverse_lazy
from django.utils.translation import ugettext_lazy as _

from horizon import exceptions
from horizon import tables
from horizon import workflows
from horizon.utils import memoized

from openstack_dashboard import api
from openstack_dashboard.dashboards.project.images.images import views

from openstack_dashboard.dashboards.admin.images import forms
from openstack_dashboard.dashboards.admin.images \
    import tables as project_tables
from openstack_dashboard.dashboards.admin.images \
    import workflows as image_workflows


class IndexView(tables.DataTableView):
    table_class = project_tables.AdminImagesTable
    template_name = 'admin/images/index.html'

    def has_more_data(self, table):
        return self._more

    def get_data(self):
        images = []
        filters = {'is_public': None}
        marker = self.request.GET.get(
            project_tables.AdminImagesTable._meta.pagination_param, None)
        try:
            images, self._more = api.glance.image_list_detailed(self.request,
                                                            marker=marker,
                                                            paginate=True,
                                                            filters=filters)
        except Exception:
            self._more = False
            msg = _('Unable to retrieve image list.')
            exceptions.handle(self.request, msg)
        return images


class CreateView(views.CreateView):
    template_name = 'admin/images/create.html'
    form_class = forms.AdminCreateImageForm
    success_url = reverse_lazy('horizon:admin:images:index')


class UpdateView(views.UpdateView):
    template_name = 'admin/images/update.html'
    form_class = forms.AdminUpdateImageForm
    success_url = reverse_lazy('horizon:admin:images:index')


class EditCapabilitiesAndRequirementsView(workflows.WorkflowView):
    workflow_class = image_workflows.EditCapabilitiesAndRequirements

    def get_initial(self):
        image_id = self.kwargs['image_id']
        token = self.request.user.token.id

        try:
            image = api.glance.image_get(self.request, image_id)
            image_type = 'image'
            if image.properties and \
               image.properties.get('image_type', '').lower() == \
               'snapshot':
                image_type = 'snapshot'

        except Exception:
            url = reverse('horizon:admin:images:index')
            exceptions.handle(self.request,
                              _("Unable to retrieve image tags."),
                              redirect=url)

        return {'image_id': image_id,
                'image_type': image_type,
                'token': token}


class DetailView(views.DetailView):
    """Admin placeholder for image detail view."""
    pass
