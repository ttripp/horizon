# (c) Copyright [2014] Hewlett-Packard Development Company, L.P.
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
# http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.
import re

from django.conf import settings
from django.utils.translation import ugettext_lazy as _

from horizon import workflows

INDEX_URL = "horizon:admin:images:index"


class GraffitiCapabilitiesAction(workflows.EditGraffitiCapabilitiesAction):

    class Meta:
        name = _("Capabilities")
        slug = 'capabilities'


class GraffitiCapabilities(workflows.EditGraffitiCapabilitiesStep):
    action_class = GraffitiCapabilitiesAction
    depends_on = ('image_id',
                  'image_type')

    def __init__(self, workflow):
        super(GraffitiCapabilities, self).__init__(workflow)

        self.token = workflow.request.user.token.id
        self.endpoint_id = None
        for entry in workflow.request.user.service_catalog:
            if entry['type'] == 'image':
                self.endpoint_id = entry['endpoints'][0]['id']
                break
        self.service_url = getattr(settings, 'GRAFFITI_URL', '')
        # TODO(heather): take this out!
        self.temp_token = getattr(settings, 'GRAFFITI_TOKEN', '')
        self.temp_url = getattr(settings, 'GRAFFITI_TEMP_URL', '')
        self.namespace_type_mapping = getattr(
            settings, 'GRAFFITI_NAMESPACE_TYPE_MAPPING', '')

    def prepare_action_context(self, request, context):
        context = super(GraffitiCapabilities,
                        self).prepare_action_context(request, context)
        self.obj_id = context.get('image_id')
        self.obj_type = context.get('image_type')
        return context


class GraffitiRequirementsAction(workflows.EditGraffitiRequirementsAction):

    class Meta:
        name = _("Requirements")
        slug = 'requirements'


class GraffitiRequirements(workflows.EditGraffitiRequirementsStep):
    action_class = GraffitiRequirementsAction
    depends_on = ('image_id',
                  'image_type')

    def __init__(self, workflow):
        super(GraffitiRequirements, self).__init__(workflow)

        self.token = workflow.request.user.token.id
        self.endpoint_id = None
        for entry in workflow.request.user.service_catalog:
            if entry['type'] == 'image':
                self.endpoint_id = entry['endpoints'][0]['id']
                break
        self.service_url = getattr(settings, 'GRAFFITI_URL', '')
        # TODO(heather): take this out!
        self.temp_token = getattr(settings, 'GRAFFITI_TOKEN', '')
        self.temp_url = getattr(settings, 'GRAFFITI_TEMP_URL', '')
        self.namespace_type_mapping = getattr(
            settings, 'GRAFFITI_NAMESPACE_TYPE_MAPPING', '')

    def prepare_action_context(self, request, context):
        context = super(GraffitiRequirements,
                        self).prepare_action_context(request, context)
        self.obj_id = context.get('image_id')
        self.obj_type = context.get('image_type')
        return context


class EditCapabilitiesAndRequirements(workflows.Workflow):
    slug = "edit_capabilities_and_requirements"
    name = _("Edit Capabilities and Requirements")
    success_message = _('Edited capabilities and requirements on "%s".')
    failure_message = _('Unable to edit capabilities or requirements on "%s".')
    success_url = "horizon:admin:images:index"
    default_steps = (GraffitiCapabilities,
                     GraffitiRequirements)

    def handle(self, request, data):
        return data
